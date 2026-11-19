// Survey questions and answers (docs/BUILD_PLAN.md 4.9). Shared by the forms
// and the server actions, so both use the same values and wording.

import { z } from "zod";

export type Survey = "post_bid" | "career_followup";

export const BID_EFFECTS = [
  { value: "changed", label: "Yes, I changed at least one bid because of a review" },
  { value: "confirmed", label: "It confirmed a bid I had already planned" },
  { value: "no_effect", label: "I read reviews, but they did not change anything" },
  { value: "did_not_use", label: "I did not use ISB Hood for this round" },
] as const;

export const SENIORS_BANDS = ["0", "1-2", "3-5", "6+"] as const;

export const CAREER_ACTIONS = [
  { value: "applied_firm", label: "Applied to a firm" },
  { value: "skipped_firm", label: "Decided not to apply to a firm" },
  { value: "changed_prep", label: "Changed my prep plan" },
  { value: "chose_offer", label: "Chose between offers" },
  { value: "contacted_author", label: "Contacted the author" },
  { value: "none", label: "Nothing yet" },
] as const;

const values = <T extends string>(list: readonly { value: T }[]) =>
  list.map((o) => o.value) as [T, ...T[]];

export const postBidSchema = z
  .object({
    bid_effect: z.enum(values(BID_EFFECTS), { error: "Choose one answer" }),
    changed_course_ids: z.array(z.uuid()).max(20),
    seniors_asked_band: z.enum(SENIORS_BANDS, { error: "Choose one answer" }),
    note: z.string().trim().max(1000, "Keep this under 1000 characters"),
  })
  .refine((a) => a.bid_effect !== "changed" || a.changed_course_ids.length > 0, {
    path: ["changed_course_ids"],
    message: "Tick the course or courses whose bid you changed",
  });

export const careerFollowupSchema = z
  .object({
    career_action: z.enum(values(CAREER_ACTIONS), { error: "Choose one answer" }),
    action_text: z.string().trim().max(300, "Keep this to one line"),
  })
  .refine((a) => a.career_action === "none" || a.action_text.length > 0, {
    path: ["action_text"],
    message: "Say in one line what you did",
  });

export type SurveyState = {
  status: "idle" | "done" | "error";
  message: string | null;
  errors: Record<string, string>;
};

export function fieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) out[String(issue.path[0])] ??= issue.message;
  return out;
}
