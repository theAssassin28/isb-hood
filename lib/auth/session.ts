import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { shellFor, type Profile, type Shell } from "./access";

export type CurrentUser = { profile: Profile; shell: Shell };

const PROFILE_COLUMNS =
  "id, email, full_name, programme, cohort, background_function, background_industry, " +
  "years_experience_band, target_track, role, account_type, verification_status, source, notify_pref, " +
  "profile_completed_at, deleted_at";

/**
 * The signed-in user, or null. Read once per request. Reads cookies, so any
 * component that calls it must render inside a <Suspense> boundary.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Touch the request first, so a page that asks who the user is can never be
  // prerendered at build time, whatever the environment looks like then.
  await cookies();
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;

  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle<Profile>();
  if (!data || data.deleted_at) return null;

  return { profile: data, shell: shellFor(data) };
});

/** Signed in, any state. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  return user;
}

/** Signed in with a finished profile (readers and contributors alike). */
export async function requireProfile(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.shell === "onboarding") redirect("/onboarding");
  return user;
}

/** May write entries: anyone with a finished profile who has not been rejected. */
export async function requireWriter(): Promise<CurrentUser> {
  const user = await requireProfile();
  if (user.shell === "rejected") redirect("/");
  return user;
}

/** May read other people's content: ISB account or verified contributor. */
export async function requireReader(): Promise<CurrentUser> {
  const user = await requireProfile();
  if (user.shell !== "full") redirect("/");
  return user;
}

/** Moderators only. Everyone else gets a 404, so admin routes are not advertised. */
export async function requireModerator(): Promise<CurrentUser> {
  const user = await requireProfile();
  if (user.profile.role !== "moderator") notFound();
  return user;
}
