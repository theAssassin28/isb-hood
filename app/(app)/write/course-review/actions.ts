"use server";

import { safeCourseId } from "@/lib/auth/access";
import { requireWriter } from "@/lib/auth/session";
import { track } from "@/lib/domain/events";
import {
  newOfferingSchema,
  parseDraft,
  STEPS,
  toDraftRow,
  toPublishedRow,
  validateReview,
  type ReviewErrors,
} from "@/lib/schemas/courseReview";
import { createClient } from "@/lib/supabase/server";

const uuid = safeCourseId; // same shape check

export type SaveInput = {
  reviewId: string | null;
  courseId: string;
  /** An existing offering id, or a professor and term that is not listed. */
  offering: { id: string } | { professor: string; term_label: string; cohort_year: string };
  fields: unknown;
  /** Step just completed (0-based), for the drop-off diagnostic. */
  step: number;
  /** Active seconds spent in the form so far, across sessions. */
  formSeconds: number;
  /** Moderators only: entering a review for a consenting senior. */
  onBehalf: { name: string; cohort: string } | null;
  /**
   * A background save while the writer is typing. Saves the draft like the end
   * of a step, but logs no form_step_completed, so drop-off stays accurate.
   */
  autosave?: boolean;
};

export type SaveResult =
  | {
      ok: true;
      reviewId: string;
      offeringId: string;
      status: "draft" | "pending_verification" | "live";
      /** The professor or term was proposed and awaits a moderator. */
      offeringPending: boolean;
    }
  | {
      ok: false;
      error: string;
      fieldErrors?: ReviewErrors;
      offeringErrors?: Record<string, string>;
    };

const GENERIC = "We could not save that. Check your connection and try again.";

/** Save the draft: at the end of a step, or in the background while typing. Never publishes. */
export async function saveDraft(input: SaveInput): Promise<SaveResult> {
  return persist(input, "draft");
}

/** Publish, or save changes to an already published review. */
export async function publishReview(input: SaveInput): Promise<SaveResult> {
  return persist(input, "publish");
}

async function persist(input: SaveInput, mode: "draft" | "publish"): Promise<SaveResult> {
  const { profile } = await requireWriter();
  const supabase = await createClient();

  const courseId = uuid(input.courseId);
  const reviewId = input.reviewId === null ? null : uuid(input.reviewId);
  const fields = parseDraft(input.fields);
  if (!courseId || (input.reviewId !== null && !reviewId) || !fields) {
    return { ok: false, error: "Something in the form was not understood. Reload and try again." };
  }
  const formSeconds = Math.max(0, Math.min(Math.round(Number(input.formSeconds) || 0), 86_400));

  // ---- which offering
  let offeringId: string;
  let offeringPending: boolean;
  if ("id" in input.offering) {
    const id = uuid(input.offering.id);
    const { data } = id
      ? await supabase
          .from("offerings")
          .select("id, status")
          .eq("id", id)
          .eq("course_id", courseId)
          .maybeSingle<{ id: string; status: string }>()
      : { data: null };
    if (!data) return { ok: false, error: "Choose the professor and term you took." };
    offeringId = data.id;
    offeringPending = data.status === "pending";
  } else {
    const parsed = newOfferingSchema.safeParse(input.offering);
    if (!parsed.success) {
      const offeringErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues)
        offeringErrors[String(issue.path[0])] ??= issue.message;
      return { ok: false, error: "Check the professor and term.", offeringErrors };
    }
    // Reuse a matching offering rather than creating a near-duplicate.
    const { data: existing } = await supabase
      .from("offerings")
      .select("id, status")
      .eq("course_id", courseId)
      .ilike("professor", parsed.data.professor.replace(/[%_\\]/g, "\\$&"))
      .eq("term_label", parsed.data.term_label)
      .eq("cohort_year", parsed.data.cohort_year)
      .limit(1)
      .returns<{ id: string; status: string }[]>();
    if (existing && existing.length > 0) {
      offeringId = existing[0].id;
      offeringPending = existing[0].status === "pending";
    } else {
      const { data: created, error } = await supabase
        .from("offerings")
        .insert({ course_id: courseId, ...parsed.data, status: "pending", created_by: profile.id })
        .select("id")
        .single<{ id: string }>();
      if (error || !created) return { ok: false, error: GENERIC };
      offeringId = created.id;
      offeringPending = true;
    }
  }

  // ---- on behalf of (moderators only; the database enforces this too)
  const behalf =
    profile.role === "moderator" && input.onBehalf && input.onBehalf.name.trim() !== ""
      ? {
          on_behalf_of_name: input.onBehalf.name.trim().slice(0, 80),
          on_behalf_of_cohort: input.onBehalf.cohort.trim().slice(0, 20) || null,
        }
      : {};

  // ---- what is already stored
  let previousStatus: string | null = null;
  if (reviewId) {
    const { data } = await supabase
      .from("course_reviews")
      .select("status")
      .eq("id", reviewId)
      .eq("author_id", profile.id)
      .maybeSingle<{ status: string }>();
    if (!data) return { ok: false, error: "That review could not be found." };
    if (data.status === "removed") {
      return { ok: false, error: "This review was removed by a moderator and cannot be changed." };
    }
    previousStatus = data.status;
  }
  const wasPublished = previousStatus !== null && previousStatus !== "draft";

  // A published review is only rewritten by an explicit, complete save.
  if (mode === "draft" && wasPublished) {
    return {
      ok: true,
      reviewId: reviewId!,
      offeringId,
      status: previousStatus as "pending_verification" | "live",
      offeringPending,
    };
  }

  let row: Record<string, unknown>;
  if (mode === "publish") {
    const checked = validateReview(fields);
    if (!checked.ok) {
      return {
        ok: false,
        error: "Some answers are missing. They are marked below.",
        fieldErrors: checked.errors,
      };
    }
    // Ask for `live`; the database decides between live and pending_verification.
    row = { ...toPublishedRow(checked.data), status: "live" };
  } else {
    row = { ...toDraftRow(fields), status: "draft" };
  }
  row = { ...row, ...behalf, offering_id: offeringId, form_seconds: formSeconds };

  const query = reviewId
    ? supabase.from("course_reviews").update(row).eq("id", reviewId).eq("author_id", profile.id)
    : supabase.from("course_reviews").insert({ ...row, author_id: profile.id });
  const { data: saved, error } = await query
    .select("id, status")
    .single<{ id: string; status: "draft" | "pending_verification" | "live" }>();

  if (error || !saved) {
    if (error?.code === "23505") {
      return {
        ok: false,
        error:
          "You already have a review for this professor and term. Open it from Write to edit it.",
      };
    }
    return { ok: false, error: GENERIC };
  }

  // ---- events (docs/BUILD_PLAN.md 8.1)
  if (!reviewId) {
    await track(profile.id, "form_started", { entry_type: "course_review", course_id: courseId });
  }
  if (mode === "draft" && !input.autosave) {
    await track(profile.id, "form_step_completed", {
      entry_type: "course_review",
      step: Math.max(0, Math.min(Math.round(Number(input.step) || 0), STEPS.length - 1)),
    });
  } else if (!wasPublished) {
    // Supply is counted at submission, whether or not the author is verified yet.
    await track(profile.id, "entry_submitted", {
      entry_type: "course_review",
      contributor_cohort: behalf.on_behalf_of_cohort ?? profile.cohort,
      form_seconds: formSeconds,
    });
  }

  return { ok: true, reviewId: saved.id, offeringId, status: saved.status, offeringPending };
}

export async function deleteReview(
  reviewIdInput: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { profile } = await requireWriter();
  const reviewId = uuid(reviewIdInput);
  if (!reviewId) return { ok: false, error: "That review could not be found." };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("course_reviews")
    .delete({ count: "exact" })
    .eq("id", reviewId)
    .eq("author_id", profile.id);
  if (error || count === 0) return { ok: false, error: "We could not delete that. Try again." };
  return { ok: true };
}
