import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notice, pageColumn, primaryButton } from "@/components/styles";
import { safeCourseId } from "@/lib/auth/access";
import { requireWriter } from "@/lib/auth/session";
import { getCourseWithOfferings } from "@/lib/db/courses";
import { getMyReview, getMyReviewForOfferings, type MyReview } from "@/lib/db/reviews";
import { EMPTY_REVIEW, firstIncompleteStep } from "@/lib/schemas/courseReview";
import { createClient } from "@/lib/supabase/server";
import { ReviewForm } from "./review-form";

export const metadata: Metadata = { title: "Write a review · ISB Hood" };

// /write/course-review?course=<id>            start, or resume your review of a course
// /write/course-review?review=<id>            edit one of your reviews
// /write/course-review?course=<id>&behalf=1   moderators: a new entry for someone else
export default function WriteCourseReviewPage({ searchParams }: PageProps<"/write/course-review">) {
  return (
    <main className={pageColumn}>
      <Suspense fallback={<p className="text-muted-foreground">Loading the form…</p>}>
        <Editor searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Editor({
  searchParams,
}: {
  searchParams: PageProps<"/write/course-review">["searchParams"];
}) {
  const { profile } = await requireWriter();
  const params = await searchParams;
  const reviewParam = safeCourseId(params.review);
  const isModerator = profile.role === "moderator";
  const newOnBehalf = isModerator && params.behalf === "1";

  let existing: MyReview | null = null;
  let courseId = safeCourseId(params.course);

  if (reviewParam) {
    existing = await getMyReview(profile.id, reviewParam);
    if (!existing) return <Missing text="That review could not be found, or it is not yours." />;
    if (existing.status === "removed") {
      return <Missing text="This review was removed by a moderator and cannot be edited." />;
    }
    const supabase = await createClient();
    const { data } = await supabase
      .from("offerings")
      .select("course_id")
      .eq("id", existing.offering_id)
      .maybeSingle<{ course_id: string }>();
    courseId = data?.course_id ?? null;
  }

  if (!courseId) return <Missing text="Choose a course to review." />;
  const course = await getCourseWithOfferings(courseId);
  if (!course) return <Missing text="That course could not be found." />;

  if (!existing && !newOnBehalf) {
    existing = await getMyReviewForOfferings(
      profile.id,
      course.offerings.map((o) => o.id),
    );
  }

  const fields = existing?.fields ?? EMPTY_REVIEW;
  const status = existing ? (existing.status as "draft" | "pending_verification" | "live") : null;

  return (
    <ReviewForm
      // A different review is a different form: never carry state across.
      key={existing?.id ?? `new-${course.id}-${newOnBehalf}`}
      course={{ id: course.id, code: course.code, title: course.title }}
      offerings={course.offerings.map((o) => ({
        id: o.id,
        professor: o.professor,
        term_label: o.term_label,
        cohort_year: o.cohort_year,
        status: o.status,
      }))}
      initial={{
        reviewId: existing?.id ?? null,
        offeringId: existing?.offering_id ?? null,
        fields,
        status,
        formSeconds: existing?.form_seconds ?? 0,
        // A draft resumes where it stopped; a published review opens at the start.
        startStep: status === "draft" ? firstIncompleteStep(fields) : 0,
        onBehalf: existing?.on_behalf_of_name
          ? { name: existing.on_behalf_of_name, cohort: existing.on_behalf_of_cohort ?? "" }
          : null,
      }}
      author={{
        name: profile.full_name ?? "ISB student",
        cohort: profile.cohort ?? "ISB",
      }}
      isModerator={isModerator}
    />
  );
}

function Missing({ text }: { text: string }) {
  return (
    <>
      <h1 className="type-title">Write a course review</h1>
      <p className={`${notice} mt-6`}>{text}</p>
      <Link href="/write" className={`${primaryButton} mt-6`}>
        See all courses
      </Link>
    </>
  );
}
