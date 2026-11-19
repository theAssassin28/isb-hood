import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CoursePageView } from "@/components/course-page-view";
import { CoursesClosedForYl } from "@/components/courses-closed";
import { FakeDoor } from "@/components/fake-door";
import { FlagButton } from "@/components/flag-button";
import { ReviewThread } from "@/components/review-thread";
import { notice, pageColumn } from "@/components/styles";
import { TrackOnMount } from "@/components/track-on-mount";
import { safeCourseId } from "@/lib/auth/access";
import { requireReader } from "@/lib/auth/session";
import { listComments } from "@/lib/db/comments";
import { loadCoursePage, scopedReviews } from "@/lib/db/coursePage";
import { getSettings } from "@/lib/db/settings";
import { coursesOpenTo } from "@/lib/domain/settings";
import { buildThreads } from "@/lib/domain/threads";
import { recordCourseView } from "../actions";

export const metadata: Metadata = { title: "Course · ISB Hood" };

export default function CoursePage({ params, searchParams }: PageProps<"/courses/[courseId]">) {
  return (
    <main className={pageColumn}>
      <Suspense fallback={<p className="text-muted-foreground">Loading the course…</p>}>
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

  const courseId = safeCourseId(rawId);
  if (!courseId) notFound();
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

  const scope = query.prof === "current" && data.current ? "current" : "all";
  const { reviews, summary } = scopedReviews(data, scope);
  const comments = await listComments(
    "course_review",
    reviews.map((r) => r.id),
  );
  const threads = buildThreads(comments ?? []);
  const openThreadId = safeCourseId(query.thread);

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
