"use server";

import { safeCourseId } from "@/lib/auth/access";
import { requireReader } from "@/lib/auth/session";
import { loadCoursePage } from "@/lib/db/coursePage";
import { getSettings } from "@/lib/db/settings";
import { MIN_REVIEWS_FOR_CONFIDENCE } from "@/lib/domain/aggregation";
import type { FilterName } from "@/lib/domain/courseList";
import { track, trackOnce } from "@/lib/domain/events";
import { coursesOpenTo, returnVisit } from "@/lib/domain/settings";

// View events are sent by the page once it is actually on screen, not while
// rendering: Next prefetches pages on links, and a prefetch is not a view.
// The numbers recorded are recomputed here from the database, never taken
// from the browser.

export async function recordCourseView(courseIdInput: string): Promise<void> {
  const { profile } = await requireReader();
  const courseId = safeCourseId(courseIdInput);
  if (!courseId) return;

  const settings = await getSettings();
  if (!coursesOpenTo(profile, settings)) return;
  const data = await loadCoursePage(courseId, settings, profile.role === "moderator");
  if (!data || data === "hidden") return;

  const reviewCount = data.reviews.length;
  await track(profile.id, "course_page_viewed", {
    course_id: courseId,
    review_count: reviewCount,
    has_new_or_changed_flag: data.banner !== null,
    current_term: data.current?.term_label ?? null,
  });

  // "Event 3: came back" (plan 6.4), at most once a day.
  const visit = returnVisit(new Date(), profile.profile_completed_at);
  if (visit) await trackOnce(profile.id, "return_visit", { ...visit, module: "courses" });

  // "Event 2: got the thing" for courses (plan 6.4).
  if (reviewCount >= MIN_REVIEWS_FOR_CONFIDENCE) {
    await trackOnce(profile.id, "value_reached", {
      module: "courses",
      trigger: "course_page_3_plus_reviews",
      entry_id: courseId,
    });
  }
}

const FILTER_NAMES: FilterName[] = ["search", "term", "workload", "quant_qual", "track"];

/** Diagnostic only (plan 6.4): never counted as an outcome. */
export async function recordFilters(names: string[]): Promise<void> {
  const { profile } = await requireReader();
  const valid = [...new Set(names)].filter((n): n is FilterName =>
    FILTER_NAMES.includes(n as FilterName),
  );
  for (const name of valid) {
    await track(profile.id, "filter_used", { filter_name: name, page: "courses" });
  }
}
