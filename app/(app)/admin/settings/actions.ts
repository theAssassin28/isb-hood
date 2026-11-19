"use server";

import { refresh } from "next/cache";
import { requireModerator } from "@/lib/auth/session";
import { SETTING_SCHEMAS, type AppSettings } from "@/lib/domain/settings";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = {
  saved: boolean;
  errors: Partial<Record<keyof AppSettings, string>>;
  /** What was submitted, so a rejected form keeps the edits. */
  values: Record<string, string> | null;
  version: number;
};

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

export async function saveSettings(
  previous: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const { profile } = await requireModerator();
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) values[key] = String(value);

  const candidate: Record<keyof AppSettings, unknown> = {
    careers_write_open: formData.get("careers_write_open") === "on",
    careers_read_open: formData.get("careers_read_open") === "on",
    yl_read_open: formData.get("yl_read_open") === "on",
    min_reviews_to_open_course: Number(text(formData, "min_reviews_to_open_course")),
    bid_term_label: text(formData, "bid_term_label"),
    bid_window: {
      start: text(formData, "bid_window_start"),
      end: text(formData, "bid_window_end"),
    },
    post_bid_survey_window: {
      start: text(formData, "post_bid_survey_window_start"),
      end: text(formData, "post_bid_survey_window_end"),
    },
    post_bid_survey_cohort: text(formData, "post_bid_survey_cohort"),
    career_followup_days: Number(text(formData, "career_followup_days")),
    career_followup_deadline: text(formData, "career_followup_deadline"),
    allowed_reader_domains: text(formData, "allowed_reader_domains")
      .split(/[\s,]+/)
      .map((d) => d.toLowerCase().replace(/^@/, ""))
      .filter(Boolean),
  };

  const errors: SettingsState["errors"] = {};
  const rows: { key: string; value: unknown; updated_by: string; updated_at: string }[] = [];
  const now = new Date().toISOString();
  for (const key of Object.keys(SETTING_SCHEMAS) as (keyof AppSettings)[]) {
    const parsed = SETTING_SCHEMAS[key].safeParse(candidate[key]);
    if (!parsed.success) {
      errors[key] = "Not a valid value";
      continue;
    }
    rows.push({ key, value: parsed.data, updated_by: profile.id, updated_at: now });
  }
  for (const key of ["bid_window", "post_bid_survey_window"] as const) {
    const w = candidate[key] as { start: string; end: string };
    if (!errors[key] && w.start > w.end) errors[key] = "The end is before the start";
  }
  if (Object.keys(errors).length > 0) {
    return { saved: false, errors, values, version: previous.version + 1 };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("app_settings").upsert(rows, { onConflict: "key" });
  if (error) {
    return { saved: false, errors: {}, values, version: previous.version + 1 };
  }
  refresh();
  return { saved: true, errors: {}, values: null, version: previous.version + 1 };
}
