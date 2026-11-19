"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, siteUrl } from "@/lib/supabase/env";
import { DEFAULT_READER_DOMAINS, safeCampaign, safeCourseId, safeNextPath } from "./access";
import { writeIntent } from "./intent";

/**
 * Starts Google sign-in. The form's hidden `intent` field says which door the
 * person used; who they actually are is decided in /auth/callback, from the
 * email on the session Google returns.
 */
export async function signInWithGoogle(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) redirect("/signin-problem");

  const intent = formData.get("intent") === "contributor" ? "contributor" : "reader";
  const next = safeNextPath(formData.get("next"));
  await writeIntent({
    intent,
    src: safeCampaign(formData.get("src")),
    course: safeCourseId(formData.get("course")),
    next,
  });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl()}/auth/callback`,
      queryParams: {
        prompt: "select_account",
        // A hint to Google's account chooser only. Not a security control.
        // Left off for email links: alumni authors answering questions use
        // non-ISB accounts.
        ...(intent === "reader" && !next ? { hd: DEFAULT_READER_DOMAINS[0] } : {}),
      },
    },
  });

  if (error || !data.url) redirect("/signin-problem");
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/signin");
}
