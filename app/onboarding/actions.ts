"use server";

import { redirect } from "next/navigation";
import { landingPath } from "@/lib/auth/access";
import { clearIntent, readIntent } from "@/lib/auth/intent";
import { requireUser } from "@/lib/auth/session";
import { track } from "@/lib/domain/events";
import { profileSchema, type ProfileField } from "@/lib/schemas/profile";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = {
  errors: Partial<Record<ProfileField, string>>;
  message: string | null;
  values: Partial<Record<ProfileField, string>>;
};

const FIELDS: ProfileField[] = [
  "full_name",
  "programme",
  "cohort",
  "background_function",
  "background_industry",
  "years_experience_band",
  "target_track",
  "heard_from",
];

export async function completeProfile(
  _previous: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireUser();
  const { profile } = user;

  const values: Partial<Record<ProfileField, string>> = {};
  for (const field of FIELDS) {
    const value = formData.get(field);
    if (typeof value === "string" && value !== "") values[field] = value;
  }

  // People who came through an outreach link already have a source.
  const needsHeardFrom = profile.source === null;

  // heard_from is checked by hand below, because it is only asked sometimes.
  const parsed = profileSchema.omit({ heard_from: true }).safeParse(values);
  const heardFrom = profileSchema.shape.heard_from.safeParse(values.heard_from);

  const errors: OnboardingState["errors"] = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors[issue.path[0] as ProfileField] ??= issue.message;
    }
  }
  if (needsHeardFrom && !heardFrom.success) {
    errors.heard_from = "Tell us how you heard about ISB Hood";
  }
  if (!parsed.success || Object.keys(errors).length > 0) {
    return { errors, message: "Check the highlighted answers.", values };
  }
  const input = parsed.data;

  const source = profile.source ?? (heardFrom.success ? heardFrom.data : null);
  const firstCompletion = profile.profile_completed_at === null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: input.full_name,
      programme: input.programme,
      cohort: input.cohort,
      background_function: input.background_function,
      background_industry: input.background_industry,
      years_experience_band: input.years_experience_band,
      target_track: input.target_track,
      source,
      ...(firstCompletion ? { profile_completed_at: new Date().toISOString() } : {}),
    })
    .eq("id", profile.id);

  if (error) {
    return {
      errors: {},
      message: "We could not save your profile. Check your connection and try again.",
      values,
    };
  }

  if (firstCompletion) {
    // "Event 1: arrived" (requirements, section 9).
    await track(profile.id, "user_signed_up", {
      programme: input.programme,
      cohort: input.cohort,
      background: input.background_function,
      target_track: input.target_track,
      source,
    });
  }

  const intent = await readIntent();
  await clearIntent();
  redirect(landingPath(intent));
}
