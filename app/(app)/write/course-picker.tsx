"use client";

import Link from "next/link";
import { useState } from "react";
import { cardFrame, fieldInput, notice } from "@/components/styles";

export type PickerCourse = {
  id: string;
  code: string;
  title: string;
  /** Current professor and term, if known. */
  current: string | null;
  /** Professors who have taught it, for search. */
  professors: string[];
};

export function CoursePicker({
  courses,
  isModerator,
}: {
  courses: PickerCourse[];
  isModerator: boolean;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const shown =
    needle === ""
      ? courses
      : courses.filter((c) =>
          [c.title, c.code, ...c.professors].some((text) => text.toLowerCase().includes(needle)),
        );

  return (
    <div>
      <label htmlFor="course-search" className="sr-only">
        Search courses
      </label>
      <input
        id="course-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by course, code or professor"
        className={fieldInput}
      />

      {shown.length === 0 ? (
        <p className={`${notice} mt-4`}>
          No course matches “{query.trim()}”. Check the spelling, or tell the ISB Hood team which
          course is missing.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {shown.map((course) => (
            <li key={course.id} className={cardFrame}>
              <Link
                href={`/write/course-review?course=${course.id}`}
                className="block min-h-11 rounded-lg p-5 hover:bg-background"
              >
                <span className="block font-semibold text-foreground">{course.title}</span>
                <span className="block text-sm text-muted-foreground">
                  {course.code}
                  {course.current ? ` · ${course.current}` : ""}
                </span>
              </Link>
              {isModerator ? (
                <Link
                  href={`/write/course-review?course=${course.id}&behalf=1`}
                  className="block border-t border-border px-4 py-2 text-sm text-brand underline underline-offset-4"
                >
                  Enter a review for someone else
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
