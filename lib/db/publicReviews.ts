import "server-only";
import {
  PUBLIC_REVIEW_COLUMNS,
  toPublicReview,
  type PublicReview,
} from "@/lib/domain/publicReview";
import { createClient } from "@/lib/supabase/server";

// Other people's reviews, only ever through course_reviews_public: live
// reviews on approved offerings, with the author shown the way they chose.

/** Every live review of one course, newest first. null if the read failed. */
export async function listCourseReviews(courseId: string): Promise<PublicReview[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_reviews_public")
    .select(PUBLIC_REVIEW_COLUMNS)
    .eq("course_id", courseId)
    .order("published_at", { ascending: false })
    .returns<Record<string, unknown>[]>();
  return error ? null : data.map(toPublicReview);
}

/** Every live review on the site, for the course list. A few hundred rows. */
export async function listAllLiveReviews(): Promise<PublicReview[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_reviews_public")
    .select(PUBLIC_REVIEW_COLUMNS)
    .returns<Record<string, unknown>[]>();
  return error ? null : data.map(toPublicReview);
}
