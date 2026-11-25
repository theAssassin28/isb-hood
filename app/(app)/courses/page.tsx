import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CourseGridSkeleton } from "@/components/skeleton";
import { CourseCardItem } from "@/components/course-card";
import { CourseFilters } from "@/components/course-filters";
import { CoursesClosedForYl } from "@/components/courses-closed";
import { notice, pageWide } from "@/components/styles";
import { SurveyPrompt } from "@/components/survey-prompt";
import { TrackOnMount } from "@/components/track-on-mount";
import { requireReader } from "@/lib/auth/session";
import { listCoursesWithOfferings } from "@/lib/db/courses";
import { listAllLiveReviews } from "@/lib/db/publicReviews";
import { getSettings } from "@/lib/db/settings";
import { applyFilters, parseFilters, termsOffered, toCard } from "@/lib/domain/courseList";
import type { PublicReview } from "@/lib/domain/publicReview";
import { courseVisible, coursesOpenTo, isBidSeason } from "@/lib/domain/settings";
import { recordFilters } from "./actions";

export const metadata: Metadata = { title: "Courses · ISB Hood" };

export default function CoursesPage({ searchParams }: PageProps<"/courses">) {
  return (
    <main className={pageWide}>
      <h1 className="type-title">Courses</h1>
      <p className="mt-2 max-w-[65ch] text-foreground/80">
        What earlier batches said about workload, grading and teaching, by professor and term.
      </p>
      <div className="mt-6">
        <Suspense fallback={<CourseGridSkeleton />}>
          <CourseList searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function CourseList({
  searchParams,
}: {
  searchParams: PageProps<"/courses">["searchParams"];
}) {
  const { profile } = await requireReader();
  const [params, settings, courses, reviews] = await Promise.all([
    searchParams,
    getSettings(),
    listCoursesWithOfferings(),
    listAllLiveReviews(),
  ]);
  if (!coursesOpenTo(profile, settings)) return <CoursesClosedForYl />;
  if (!courses || !reviews) {
    return (
      <p role="alert" className={notice}>
        Courses could not be loaded. Reload the page to try again.
      </p>
    );
  }

  const byCourse = new Map<string, PublicReview[]>();
  for (const review of reviews) {
    byCourse.set(review.course_id, [...(byCourse.get(review.course_id) ?? []), review]);
  }
  const isModerator = profile.role === "moderator";
  const cards = courses
    .map((course) => toCard(course, course.offerings, byCourse.get(course.id) ?? []))
    .filter((card, i) => courseVisible(courses[i], card.reviewCount, settings, isModerator));

  if (cards.length === 0) {
    return (
      <div className={notice}>
        <p>No courses are open yet. Seniors and alumni are writing the first reviews now.</p>
        <Link
          href="/write"
          className="mt-2 inline-flex min-h-11 items-center font-medium text-brand underline underline-offset-4"
        >
          Took a course? Write a review
        </Link>
      </div>
    );
  }

  const defaultTerm = isBidSeason(new Date(), settings) ? settings.bid_term_label : null;
  const { filters, chosen, termIsDefault } = parseFilters(params, defaultTerm);
  const shown = applyFilters(cards, filters);
  const activeCount = chosen.filter((c) => c !== "search").length;

  return (
    <>
      {chosen.length > 0 ? (
        <TrackOnMount key={JSON.stringify(params)} action={recordFilters.bind(null, chosen)} />
      ) : null}

      <div className="mb-6 max-w-xl empty:hidden">
        <SurveyPrompt />
      </div>

      <CourseFilters filters={filters} terms={termsOffered(cards)} activeCount={activeCount} />

      {termIsDefault ? (
        <p className="mt-4 text-sm text-foreground">
          Showing {filters.term} courses, the ones you are bidding for.{" "}
          <Link
            href="/courses?term=all"
            className="font-medium text-brand underline underline-offset-4"
          >
            Show all terms
          </Link>
        </p>
      ) : null}

      <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
        {shown.length} of {cards.length} courses
      </p>

      {shown.length === 0 ? (
        <div className={`${notice} mt-3`}>
          <p>No course matches{filters.q ? ` “${filters.q}”` : ""} with these filters.</p>
          <Link
            href="/courses?term=all"
            className="mt-2 inline-flex min-h-11 items-center font-medium text-brand underline underline-offset-4"
          >
            Clear filters
          </Link>
        </div>
      ) : (
        <ul className="mt-4 grid gap-4 lg:grid-cols-3">
          {shown.map((card) => (
            <CourseCardItem key={card.id} course={card} />
          ))}
        </ul>
      )}
    </>
  );
}
