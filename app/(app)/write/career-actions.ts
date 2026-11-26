"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { safeCourseId } from "@/lib/auth/access";
import { requireWriter } from "@/lib/auth/session";
import { getSettings } from "@/lib/db/settings";
import { track } from "@/lib/domain/events";
import { mentionsPayFigures, PAY_FIGURE_WARNING } from "@/lib/domain/payFigures";
import { careerWritingOpenTo } from "@/lib/domain/settings";
import { companyNoteSchema, playbookSchema } from "@/lib/schemas/careerEntry";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Publish (or save changes to) a track playbook or company note
// (docs/BUILD_PLAN.md 5.2). The database decides live or pending_verification.

export type CareerSaveInput = {
  type: "playbook" | "company_note";
  entryId: string | null;
  body: unknown;
  visibility: "named" | "anonymous";
  openToQuestions: boolean;
  /** Playbooks: "courses that helped". */
  courseIds: string[];
  formSeconds: number;
  /** The writer saw the pay-figure warning and chose to publish anyway. */
  confirmPay: boolean;
};

export type CareerSaveResult =
  | { ok: true; entryId: string; status: "pending_verification" | "live" }
  | { ok: false; error: string; confirmPay?: boolean };

const GENERIC = "We could not save that. Check your connection and try again.";
const MAX_COURSES = 6;

/** All the free text in an entry, for the pay-figure check. */
function allText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(allText).join("\n");
  if (value && typeof value === "object") return Object.values(value).map(allText).join("\n");
  return "";
}

export async function saveCareerEntry(input: CareerSaveInput): Promise<CareerSaveResult> {
  const { profile } = await requireWriter();
  const settings = await getSettings();
  if (!careerWritingOpenTo(profile, settings)) {
    return { ok: false, error: "Career entries are not open for writing yet." };
  }
  if (input.type !== "playbook" && input.type !== "company_note") {
    return { ok: false, error: "Reload the page and try again." };
  }
  const entryId = input.entryId === null ? null : safeCourseId(input.entryId);
  if (input.entryId !== null && !entryId) return { ok: false, error: "Reload and try again." };

  // ---- the entry itself
  let columns: Record<string, unknown>;
  let body: Record<string, unknown>;
  if (input.type === "playbook") {
    const parsed = playbookSchema.safeParse(input.body);
    if (!parsed.success) return { ok: false, error: "Some answers are missing. Check the form." };
    body = parsed.data;
    columns = {
      track: parsed.data.to.track,
      company: parsed.data.to.company || null,
      from_function: parsed.data.from.function,
      from_industry: parsed.data.from.industry,
      from_years_band: parsed.data.from.years_band,
    };
  } else {
    const parsed = companyNoteSchema.safeParse(input.body);
    if (!parsed.success) return { ok: false, error: "Some answers are missing. Check the form." };
    body = parsed.data;
    columns = {
      track: parsed.data.track,
      company: parsed.data.company,
      from_function: null,
      from_industry: null,
      from_years_band: null,
    };
  }

  // ---- no pay or offer figures (plan 5.2): ask first, flag if published anyway
  const payFigures = mentionsPayFigures(allText(body));
  if (payFigures && !input.confirmPay) {
    return { ok: false, error: PAY_FIGURE_WARNING, confirmPay: true };
  }

  const supabase = await createClient();
  let wasPublished = false;
  if (entryId) {
    const { data } = await supabase
      .from("career_entries")
      .select("status, type")
      .eq("id", entryId)
      .eq("author_id", profile.id)
      .maybeSingle<{ status: string; type: string }>();
    if (!data || data.type !== input.type) return { ok: false, error: "That entry was not found." };
    if (data.status === "removed") {
      return { ok: false, error: "This entry was removed by a moderator and cannot be changed." };
    }
    wasPublished = data.status !== "draft";
  }

  const formSeconds = Math.max(0, Math.min(Math.round(Number(input.formSeconds) || 0), 86_400));
  const row = {
    ...columns,
    type: input.type,
    body,
    visibility: input.visibility === "anonymous" ? "anonymous" : "named",
    open_to_questions: input.openToQuestions !== false,
    form_seconds: formSeconds,
    // Ask for live; the database holds it if the author is not verified yet.
    status: "live",
  };
  const query = entryId
    ? supabase.from("career_entries").update(row).eq("id", entryId).eq("author_id", profile.id)
    : supabase.from("career_entries").insert({ ...row, author_id: profile.id });
  const { data: saved, error } = await query
    .select("id, status")
    .single<{ id: string; status: "pending_verification" | "live" }>();
  if (error || !saved) return { ok: false, error: GENERIC };

  // ---- courses that helped, replaced as a set
  if (input.type === "playbook") {
    const ids = [...new Set(input.courseIds.map((c) => safeCourseId(c)).filter(Boolean))].slice(
      0,
      MAX_COURSES,
    ) as string[];
    await supabase.from("career_entry_courses").delete().eq("entry_id", saved.id);
    if (ids.length > 0) {
      await supabase
        .from("career_entry_courses")
        .insert(ids.map((course_id) => ({ entry_id: saved.id, course_id })));
    }
  }

  // ---- events (docs/BUILD_PLAN.md 8.1)
  if (!wasPublished) {
    if (!entryId) await track(profile.id, "form_started", { entry_type: input.type });
    await track(profile.id, "entry_submitted", {
      entry_type: input.type,
      contributor_cohort: profile.cohort,
      form_seconds: formSeconds,
    });
  }

  if (payFigures) {
    after(async () => {
      await createAdminClient().from("flags").insert({
        target_type: "career_entry",
        target_id: saved.id,
        reporter_id: null,
        reason: "Possible pay or offer figure, published after the warning",
        auto: true,
      });
    });
  }

  return { ok: true, entryId: saved.id, status: saved.status };
}

export async function deleteCareerEntry(entryIdInput: string): Promise<{ error: string | null }> {
  const { profile } = await requireWriter();
  const entryId = safeCourseId(entryIdInput);
  if (!entryId) return { error: "That entry could not be found." };
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("career_entries")
    .delete({ count: "exact" })
    .eq("id", entryId)
    .eq("author_id", profile.id);
  if (error || count === 0) return { error: "We could not delete that. Try again." };
  // The database cascades this; the demo's stand-in does not.
  await supabase.from("career_entry_courses").delete().eq("entry_id", entryId);
  refresh();
  return { error: null };
}
