import type { Metadata } from "next";
import { Suspense } from "react";
import { StackSkeleton } from "@/components/skeleton";
import { MyReviewsList } from "@/components/my-reviews";
import Link from "next/link";
import { cardFrame, notice, pageColumn } from "@/components/styles";
import { requireWriter } from "@/lib/auth/session";
import { listCoursesWithOfferings } from "@/lib/db/courses";
import { listMyReviews } from "@/lib/db/reviews";
import { getSettings } from "@/lib/db/settings";
import { careerWritingOpenTo } from "@/lib/domain/settings";
import { CoursePicker, type PickerCourse } from "./course-picker";

export const metadata: Metadata = { title: "Write · ISB Hood" };

// Write: a course review, a track playbook or a company note (docs/BUILD_PLAN.md 4.1).
export default function WritePage() {
  return (
    <main className={pageColumn}>
      <h1 className="type-title">Write</h1>
      <p className="mt-2 text-foreground/80">
        What you learned, for the batch behind you. Every rating needs a reason.
      </p>
      <div className="mt-6">
        <Suspense fallback={<StackSkeleton label="Loading courses…" />}>
          <Write />
        </Suspense>
      </div>
    </main>
  );
}

async function Write() {
  const { profile } = await requireWriter();
  const [courses, mine, settings] = await Promise.all([
    listCoursesWithOfferings(),
    listMyReviews(profile.id),
    getSettings(),
  ]);
  const careers = careerWritingOpenTo(profile, settings);

  if (!courses) {
    return (
      <p role="alert" className={notice}>
        Courses could not be loaded. Reload the page to try again.
      </p>
    );
  }

  const picker: PickerCourse[] = courses.map((course) => {
    const current = course.offerings.find((o) => o.is_current && o.status === "approved");
    return {
      id: course.id,
      code: course.code,
      title: course.title,
      current: current ? `${current.professor}, ${current.term_label}` : null,
      professors: [...new Set(course.offerings.map((o) => o.professor))],
    };
  });

  return (
    <>
      {careers ? (
        <section className="mb-10" aria-labelledby="career-write-heading">
          <h2 id="career-write-heading" className="type-heading">
            Your career move
          </h2>
          <ul className="mt-3 space-y-3">
            {(
              [
                [
                  "/write/playbook",
                  "Track playbook",
                  "How you got into your track, term by term. About 10 minutes.",
                ],
                [
                  "/write/company-note",
                  "Company note",
                  "One company’s process, what they asked, what prep worked. About 5 minutes.",
                ],
              ] as const
            ).map(([href, title, text]) => (
              <li key={href} className={cardFrame}>
                <Link href={href} className="block rounded-lg p-5 hover:bg-background">
                  <span className="block font-semibold text-foreground">{title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {mine && mine.length > 0 ? (
        <section className="mb-8">
          <h2 className="type-heading">Your reviews</h2>
          <MyReviewsList reviews={mine} />
        </section>
      ) : null}

      <section>
        <h2 className="type-heading">
          {mine && mine.length > 0
            ? "Review another course"
            : careers
              ? "A course review: which course?"
              : "Which course?"}
        </h2>
        <div className="mt-3">
          {picker.length === 0 ? (
            <p className={notice}>
              No courses have been added yet. The ISB Hood team is loading the course list; check
              back soon.
            </p>
          ) : (
            <CoursePicker courses={picker} isModerator={profile.role === "moderator"} />
          )}
        </div>
      </section>
    </>
  );
}
