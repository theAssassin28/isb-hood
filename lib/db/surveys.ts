import "server-only";
import { cookies } from "next/headers";
import type { Survey } from "@/lib/domain/surveys";
import { createClient } from "@/lib/supabase/server";

/** Which surveys the signed-in person may answer today. Decided in the database. */
export async function getMySurveyStatus(): Promise<Record<Survey, boolean>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_survey_status");
  if (error || !data) return { post_bid: false, career_followup: false };
  const status = data as Partial<Record<Survey, boolean>>;
  return { post_bid: status.post_bid === true, career_followup: status.career_followup === true };
}

export const snoozeCookie = (survey: Survey) => `ih_snooze_${survey}`;

/** "Not now" hides the prompt on this device until tomorrow. */
export async function isSnoozed(survey: Survey): Promise<boolean> {
  return (await cookies()).get(snoozeCookie(survey))?.value === "1";
}
