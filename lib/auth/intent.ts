import "server-only";
import { cookies } from "next/headers";
import { safeCampaign, safeCourseId, safeNextPath, type SignInIntent } from "./access";

// What the person was doing when they pressed "Continue with Google", carried
// across the round trip to Google in a short-lived cookie. A cookie rather
// than query parameters on the redirect URL, so the Supabase redirect
// allow-list only ever has to match one fixed callback address.

const COOKIE = "ih_intent";
const MAX_AGE_SECONDS = 60 * 30;

export type Intent = {
  intent: SignInIntent;
  src: string | null;
  course: string | null;
  /** Path to return to after sign-in, such as an email reply link. */
  next: string | null;
};

const DEFAULT: Intent = { intent: "reader", src: null, course: null, next: null };

export async function writeIntent(value: Intent): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, JSON.stringify(value), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function readIntent(): Promise<Intent> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return DEFAULT;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      intent: parsed.intent === "contributor" ? "contributor" : "reader",
      src: safeCampaign(parsed.src),
      course: safeCourseId(parsed.course),
      next: safeNextPath(parsed.next),
    };
  } catch {
    return DEFAULT;
  }
}

export async function clearIntent(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
