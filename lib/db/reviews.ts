import "server-only";
import { fromRow, REVIEW_COLUMNS, type ReviewFields } from "@/lib/schemas/courseReview";
import { createClient } from "@/lib/supabase/server";

// Reads of a person's OWN reviews, straight from the base table (row level
// security allows that and nothing more). Other people's reviews are only
// ever read through course_reviews_public.

export type ReviewStatus = "draft" | "pending_verification" | "live" | "removed";

export type MyReview = {
  id: string;
  offering_id: string;
  status: ReviewStatus;
  form_seconds: number;
  on_behalf_of_name: string | null;
  on_behalf_of_cohort: string | null;
  fields: ReviewFields;
};

const OWN_COLUMNS = `id, offering_id, status, form_seconds, on_behalf_of_name, on_behalf_of_cohort, ${REVIEW_COLUMNS}`;

function toMyReview(row: Record<string, unknown>): MyReview {
  return {
    id: row.id as string,
    offering_id: row.offering_id as string,
    status: row.status as ReviewStatus,
    form_seconds: typeof row.form_seconds === "number" ? row.form_seconds : 0,
    on_behalf_of_name: (row.on_behalf_of_name as string | null) ?? null,
    on_behalf_of_cohort: (row.on_behalf_of_cohort as string | null) ?? null,
    fields: fromRow(row),
  };
}

/** A review by id, only if the signed-in user wrote it. */
export async function getMyReview(userId: string, reviewId: string): Promise<MyReview | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course_reviews")
    .select(OWN_COLUMNS)
    .eq("id", reviewId)
    .eq("author_id", userId)
    .maybeSingle<Record<string, unknown>>();
  return data ? toMyReview(data) : null;
}

/** The user's own review of this course, if they have started or written one. */
export async function getMyReviewForOfferings(
  userId: string,
  offeringIds: string[],
): Promise<MyReview | null> {
  if (offeringIds.length === 0) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("course_reviews")
    .select(OWN_COLUMNS)
    .eq("author_id", userId)
    .is("on_behalf_of_name", null)
    .in("offering_id", offeringIds)
    .neq("status", "removed")
    .order("updated_at", { ascending: false })
    .limit(1)
    .returns<Record<string, unknown>[]>();
  return data && data.length > 0 ? toMyReview(data[0]) : null;
}

export type MyReviewSummary = {
  id: string;
  status: ReviewStatus;
  updated_at: string;
  on_behalf_of_name: string | null;
  offering: {
    professor: string;
    term_label: string;
    cohort_year: string;
    status: "approved" | "pending";
    course: { id: string; code: string; title: string };
  };
};

export async function listMyReviews(userId: string): Promise<MyReviewSummary[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_reviews")
    .select(
      "id, status, updated_at, on_behalf_of_name, " +
        "offering:offerings!inner(professor, term_label, cohort_year, status, course:courses!inner(id, code, title))",
    )
    .eq("author_id", userId)
    .order("updated_at", { ascending: false })
    .returns<MyReviewSummary[]>();
  return error ? null : data;
}
