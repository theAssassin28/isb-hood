import "server-only";
import {
  currentOffering,
  currentProfessorReviews,
  newOrChanged,
  summarise,
  type Banner,
  type CourseSummary,
} from "@/lib/domain/aggregation";
import type { PublicReview } from "@/lib/domain/publicReview";
import { courseVisible, type AppSettings } from "@/lib/domain/settings";
import { getCourseWithOfferings, type CourseWithOfferings } from "./courses";
import { listCourseReviews } from "./publicReviews";

export type CoursePageData = {
  course: CourseWithOfferings;
  /** All live reviews, newest first. */
  reviews: PublicReview[];
  banner: Banner;
  current: { professor: string; term_label: string; cohort_year: string } | null;
  currentProfessorCount: number;
};

/**
 * Everything the course page shows, or "hidden" when this reader may not see
 * the course, or null when it does not exist or could not be read.
 */
export async function loadCoursePage(
  courseId: string,
  settings: AppSettings,
  isModerator: boolean,
): Promise<CoursePageData | "hidden" | null> {
  const [course, reviews] = await Promise.all([
    getCourseWithOfferings(courseId),
    listCourseReviews(courseId),
  ]);
  if (!course || !reviews) return null;
  if (!courseVisible(course, reviews.length, settings, isModerator)) return "hidden";

  const approved = course.offerings.filter((o) => o.status === "approved");
  const current = currentOffering(approved);
  return {
    course,
    reviews,
    banner: newOrChanged(approved, reviews),
    current: current
      ? {
          professor: current.professor,
          term_label: current.term_label,
          cohort_year: current.cohort_year,
        }
      : null,
    currentProfessorCount: currentProfessorReviews(approved, reviews).length,
  };
}

/** The summary for the chosen scope: all reviews, or the current professor only. */
export function scopedReviews(
  data: CoursePageData,
  scope: "all" | "current",
): { reviews: PublicReview[]; summary: CourseSummary } {
  const reviews =
    scope === "current"
      ? (currentProfessorReviews(
          data.course.offerings.filter((o) => o.status === "approved"),
          data.reviews,
        ) as PublicReview[])
      : data.reviews;
  return { reviews, summary: summarise(reviews) };
}
