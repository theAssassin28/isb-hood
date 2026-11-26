import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { CoursePageSkeleton } from "@/components/skeleton";
import { CoursePageView, MIN_REVIEWS_FOR_PROFESSOR_SWITCH } from "@/components/course-page-view";
import { CoursesClosedForYl } from "@/components/courses-closed";
import { FakeDoor } from "@/components/fake-door";
import { FlagButton } from "@/components/flag-button";
import { ReviewThread } from "@/components/review-thread";
import { notice, shellWidth } from "@/components/styles";
import { TrackOnMount } from "@/components/track-on-mount";
import { safeCourseId } from "@/lib/auth/access";
import { requireReader } from "@/lib/auth/session";
import { listComments } from "@/lib/db/comments";
import { loadCoursePage, scopedReviews } from "@/lib/db/coursePage";
import { findCourseRef } from "@/lib/db/courses";
import { courseHref } from "@/lib/routes";
import { getSettings } from "@/lib/db/settings";
import { coursesOpenTo } from "@/lib/domain/settings";
import { buildThreads } from "@/lib/domain/threads";
import { recordCourseView } from "../actions";

export const metadata: Metadata = { title: "Course · ISB Hood" };

export default function CoursePage({ params, searchParams }: PageProps<"/courses/[courseId]">) {
  return (
    <main className={`${shellWidth} flex flex-1 flex-col pt-3 pb-12 lg:pt-8`}>
      <Suspense fallback={<CoursePageSkeleton />}>
        <Course params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Course({
  params,
  searchParams,
}: {
  params: PageProps<"/courses/[courseId]">["params"];
  searchParams: PageProps<"/courses/[courseId]">["searchParams"];
}) {
  const { profile } = await requireReader();
  const [{ courseId: rawId }, query, settings] = await Promise.all([
    params,
    searchParams,
    getSettings(),
  ]);
  if (!coursesOpenTo(profile, settings)) return <CoursesClosedForYl />;

  // The URL names the course by its code (/courses/MKT-501). Older links use
  // the id; they redirect to the code URL, keeping the review, thread and professor selection.
  const segment = decodeURIComponent(rawId);
  const asId = safeCourseId(segment);
  const ref = await findCourseRef(asId ? { id: asId } : { code: segment });
  if (!ref) notFound();
  if (segment !== ref.code) {
    const keep = new URLSearchParams();
    for (const key of ["thread", "prof", "review"] as const) {
      const value = query[key];
      if (typeof value === "string") keep.set(key, value);
    }
    const qs = keep.toString();
    redirect(`${courseHref(ref.code)}${qs ? `?${qs}` : ""}`);
  }
  const courseId = ref.id;
  const isModerator = profile.role === "moderator";
  const data = await loadCoursePage(courseId, settings, isModerator);
  if (data === "hidden") notFound();
  if (!data) {
    return (
      <p role="alert" className={notice}>
        This course could not be loaded. Reload the page to try again.
      </p>
    );
  }

  const openThreadId = safeCourseId(query.thread);
  const requestedReviewId = safeCourseId(query.review);
  const scope =
    query.prof === "current" &&
    !openThreadId &&
    !requestedReviewId &&
    data.currentProfessorCount >= MIN_REVIEWS_FOR_PROFESSOR_SWITCH &&
    data.currentProfessorCount < data.reviews.length
      ? "current"
      : "all";
  const { reviews, summary } = scopedReviews(data, scope);
  const comments = await listComments(
    "course_review",
    reviews.map((r) => r.id),
  );
  const threads = buildThreads(comments ?? []);
  const threadReview = openThreadId
    ? reviews.find((review) => threads.get(review.id)?.some((t) => t.question.id === openThreadId))
    : undefined;

  return (
    <>
      <TrackOnMount key={courseId} action={recordCourseView.bind(null, courseId)} />
      <CoursePageView
        course={{
          id: data.course.id,
          code: data.course.code,
          title: data.course.title,
          hiddenFromReaders: !data.course.open_to_readers,
        }}
        current={data.current}
        banner={data.banner}
        summary={summary}
        reviews={reviews}
        scope={scope}
        totalCount={data.reviews.length}
        currentProfessorCount={data.currentProfessorCount}
        myReviewId={data.reviews.find((r) => r.is_mine)?.id ?? null}
        openReviewId={threadReview?.id ?? requestedReviewId}
        afterReview={(review) => (
          <>
            {comments === null ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Questions could not be loaded. Reload to try again.
              </p>
            ) : (
              <ReviewThread
                entryId={review.id}
                threads={threads.get(review.id) ?? []}
                openToQuestions={review.open_to_questions}
                isMyEntry={review.is_mine}
                openThreadId={openThreadId}
              />
            )}
            {review.is_mine ? null : (
              <div className="mt-1 flex flex-wrap items-start justify-between gap-x-4">
                {review.open_to_questions ? (
                  <FakeDoor door="request_chat" entryId={review.id} />
                ) : (
                  <span />
                )}
                <FlagButton
                  targetType="course_review"
                  targetId={review.id}
                  label="Flag this review"
                />
              </div>
            )}
          </>
        )}
      />
    </>
  );
}
