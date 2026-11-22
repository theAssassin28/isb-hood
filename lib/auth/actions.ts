"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEMO_COOKIE } from "@/lib/demo/client";
import { db, demoProfileForEmail } from "@/lib/demo/db";
import { isDemo } from "@/lib/demo/mode";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  DEFAULT_READER_DOMAINS,
  isReaderDomain,
  normalizeCode,
  normalizeEmail,
  safeCampaign,
  safeCourseId,
  safeNextPath,
} from "./access";
import { finishSignIn, readerDomains } from "./finishSignIn";
import { writeIntent } from "./intent";

// Sign-in by a 6-digit code sent to the person's email (docs/BUILD_PLAN.md 3).
// A code rather than a link: Outlook's link scanner (Microsoft Defender Safe
// Links) opens links before the person does, which uses up one-time links.
// The reader door takes ISB addresses only; the contributor door takes any
// address, and moderators verify those people by hand.

export type SignInState = {
  step: "email" | "code";
  email: string;
  message: string | null;
  /** Changes on each code sent, so the code box can clear and refocus. */
  sentAt: number;
};

const NOT_ON = "Sign-in is not switched on yet. The team is still setting up.";

export async function requestCode(previous: SignInState, formData: FormData): Promise<SignInState> {
  // The prototype runs every check below but sends no email (see verifyCode).
  if (!isDemo() && !isSupabaseConfigured()) return { ...previous, message: NOT_ON };

  const email = normalizeEmail(formData.get("email"));

  if (!email) {
    return {
      ...previous,
      step: "email",
      message: "Enter your email address, for example name@isb.edu.",
    };
  }
  const intent = formData.get("intent") === "contributor" ? "contributor" : "reader";

  const domains = isDemo() ? DEFAULT_READER_DOMAINS : await readerDomains();
  if (intent === "reader" && !isReaderDomain(email, domains)) {
    return {
      ...previous,
      step: "email",
      email,
      message: "Use your ISB email address. Alumni without one can sign in as a contributor below.",
    };
  }

  if (isDemo()) return { step: "code", email, message: null, sentAt: Date.now() };

  await writeIntent({
    intent,
    src: safeCampaign(formData.get("src")),
    course: safeCourseId(formData.get("course")),
    next: safeNextPath(formData.get("next")),
  });

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) {
    const wait = error.status === 429 || /rate|seconds/i.test(error.message);
    return {
      ...previous,
      step: wait ? "code" : "email",
      email,
      message: wait
        ? "A code was sent a moment ago. Wait a minute before asking for another."
        : "We could not send a code. Check the address and try again.",
    };
  }
  return { step: "code", email, message: null, sentAt: Date.now() };
}

export async function verifyCode(previous: SignInState, formData: FormData): Promise<SignInState> {
  if (!isDemo() && !isSupabaseConfigured()) return { ...previous, message: NOT_ON };
  const email = normalizeEmail(formData.get("email"));
  const token = normalizeCode(formData.get("code"));
  if (!email) return { ...previous, step: "email", message: "Enter your email address again." };
  if (!token)
    return { ...previous, step: "code", email, message: "Enter the 6-digit code from the email." };

  if (isDemo()) {
    if (token.length !== 6) {
      return { ...previous, step: "code", email, message: "The code has 6 digits." };
    }
    // Prototype: any well-formed code signs in. A sample person's email signs in as them.
    const person = demoProfileForEmail(db(), email, isReaderDomain(email, DEFAULT_READER_DOMAINS));
    (await cookies()).set(DEMO_COOKIE, person.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    redirect(person.completed ? "/" : "/onboarding");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error || !data.user) {
    return {
      ...previous,
      step: "code",
      email,
      message: "That code is wrong or has expired. Use the newest email, or send a new code.",
    };
  }

  redirect(await finishSignIn(supabase, data.user));
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured() || isDemo()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/signin");
}
