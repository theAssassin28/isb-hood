import type { Metadata } from "next";
import { Suspense } from "react";
import { MyReviewsList } from "@/components/my-reviews";
import { notice, pageColumn } from "@/components/styles";
import { requireWriter } from "@/lib/auth/session";
import { listCoursesWithOfferings } from "@/lib/db/courses";
import { listMyReviews } from "@/lib/db/reviews";
import { CoursePicker, type PickerCourse } from "./course-picker";

export const metadata: Metadata = { title: "Write · ISB Hood" };

// Career entries join this screen in M7 (docs/BUILD_PLAN.md 4.1).
export default function WritePage() {
  return (
    <main className={pageColumn}>
      <h1 className="type-title">Write a course review</h1>
      <p className="mt-2 text-foreground/80">
        About 5 minutes. Your answers are saved as you go, so you can stop and come back.
      </p>
      <div className="mt-6">
        <Suspense fallback={<p className="text-muted-foreground">Loading courses…</p>}>
          <Write />
        </Suspense>
      </div>
    </main>
  );
}

async function Write() {
  const { profile } = await requireWriter();
  const [courses, mine] = await Promise.all([
    listCoursesWithOfferings(),
    listMyReviews(profile.id),
  ]);

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
      {mine && mine.length > 0 ? (
        <section className="mb-8">
          <h2 className="type-heading">Your reviews</h2>
          <MyReviewsList reviews={mine} />
        </section>
      ) : null}

      <section>
        <h2 className="type-heading">
          {mine && mine.length > 0 ? "Review another course" : "Which course?"}
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
