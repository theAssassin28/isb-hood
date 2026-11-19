"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { requireReader } from "@/lib/auth/session";
import { listCoursesWithOfferings } from "@/lib/db/courses";
import { getSettings } from "@/lib/db/settings";
import { snoozeCookie } from "@/lib/db/surveys";
import { track } from "@/lib/domain/events";
import {
  careerFollowupSchema,
  fieldErrors,
  postBidSchema,
  type Survey,
  type SurveyState,
} from "@/lib/domain/surveys";
import { createClient } from "@/lib/supabase/server";

const CLOSED = "This survey is closed, or you have already answered it. Thank you either way.";

export async function submitPostBid(
  _previous: SurveyState,
  formData: FormData,
): Promise<SurveyState> {
  const { profile } = await requireReader();
  const parsed = postBidSchema.safeParse({
    bid_effect: formData.get("bid_effect") ?? undefined,
    changed_course_ids: formData.getAll("changed_course_ids").map(String),
    seniors_asked_band: formData.get("seniors_asked_band") ?? undefined,
    note: String(formData.get("note") ?? ""),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the marked answers.",
      errors: fieldErrors(parsed.error.issues),
    };
  }
  const answer = parsed.data;

  // Only courses of the bid term can be named.
  const [settings, courses] = await Promise.all([getSettings(), listCoursesWithOfferings()]);
  const allowed = new Set(
    (courses ?? [])
      .filter((c) =>
        c.offerings.some(
          (o) =>
            o.is_current && o.status === "approved" && o.term_label === settings.bid_term_label,
        ),
      )
      .map((c) => c.id),
  );
  const changed =
    answer.bid_effect === "changed"
      ? answer.changed_course_ids.filter((id) => allowed.has(id))
      : [];
  if (answer.bid_effect === "changed" && changed.length === 0) {
    return {
      status: "error",
      message: "Check the marked answers.",
      errors: { changed_course_ids: "Tick at least one course" },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("survey_responses").insert({
    user_id: profile.id,
    survey: "post_bid",
    bid_effect: answer.bid_effect,
    changed_course_ids: changed.length > 0 ? changed : null,
    seniors_asked_band: answer.seniors_asked_band,
    note: answer.note || null,
  });
  if (error) {
    return {
      status: "error",
      message: error.code === "42501" ? CLOSED : "Your answers were not saved. Try again.",
      errors: {},
    };
  }
  await track(profile.id, "survey_submitted", { survey: "post_bid" });
  refresh();
  return { status: "done", message: null, errors: {} };
}

export async function submitCareerFollowup(
  _previous: SurveyState,
  formData: FormData,
): Promise<SurveyState> {
  const { profile } = await requireReader();
  const parsed = careerFollowupSchema.safeParse({
    career_action: formData.get("career_action") ?? undefined,
    action_text: String(formData.get("action_text") ?? ""),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the marked answers.",
      errors: fieldErrors(parsed.error.issues),
    };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("survey_responses").insert({
    user_id: profile.id,
    survey: "career_followup",
    career_action: parsed.data.career_action,
    action_text: parsed.data.career_action === "none" ? null : parsed.data.action_text,
  });
  if (error) {
    return {
      status: "error",
      message: error.code === "42501" ? CLOSED : "Your answer was not saved. Try again.",
      errors: {},
    };
  }
  await track(profile.id, "survey_submitted", { survey: "career_followup" });
  refresh();
  return { status: "done", message: null, errors: {} };
}

/** Diagnostic: the survey page was opened. */
export async function recordSurveyShown(survey: Survey): Promise<void> {
  const { profile } = await requireReader();
  if (survey !== "post_bid" && survey !== "career_followup") return;
  await track(profile.id, "survey_shown", { survey });
}

/** "Not now": hide the prompt on this device until tomorrow. */
export async function snoozeSurvey(survey: Survey): Promise<void> {
  await requireReader();
  if (survey !== "post_bid" && survey !== "career_followup") return;
  (await cookies()).set(snoozeCookie(survey), "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 20,
  });
  refresh();
}
