import Link from "next/link";
import { QUANT_QUAL_LABEL } from "@/lib/domain/aggregation";
import type { CourseCard } from "@/lib/domain/courseList";
import { courseHref } from "@/lib/routes";
import { CareerPills } from "./career-pills";
import { cardFrame } from "./styles";

const tag = "type-tag";

export function CourseCardItem({ course }: { course: CourseCard }) {
  return (
    <li className={`${cardFrame} flex flex-col hover:border-input`}>
      <Link
        href={courseHref(course.code)}
        className="flex flex-1 flex-col rounded-lg p-5 hover:bg-background"
      >
        <span className="type-heading block">{course.title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">
          {course.code}
          {course.current ? ` · ${course.current.professor}, ${course.current.term_label}` : ""}
        </span>
        <span className="mt-auto flex flex-wrap gap-1.5 pt-4">
          <span className={tag}>
            {course.reviewCount === 0
              ? "No reviews yet"
              : `${course.reviewCount} review${course.reviewCount === 1 ? "" : "s"}`}
          </span>
          {course.workload ? <span className={tag}>{course.workload.label} a week</span> : null}
          {course.quantQual ? (
            <span className={tag}>{QUANT_QUAL_LABEL[course.quantQual]}</span>
          ) : null}
          {course.flag === "changed" ? (
            <span className="type-status text-warn">New professor</span>
          ) : null}
          {course.hiddenFromReaders ? (
            <span className="type-status text-critical">Hidden from readers</span>
          ) : null}
        </span>
        {course.tracks.length > 0 ? (
          <div className="mt-3">
            <p className="type-label">Who should take it</p>
            <div className="mt-1.5">
              <CareerPills tracks={course.tracks.slice(0, 4)} label="Who should take it" />
            </div>
          </div>
        ) : null}
      </Link>
      {course.reviewCount === 0 ? (
        <Link
          href={`/write/course-review?course=${course.id}`}
          className="block border-t border-border px-4 py-3 text-sm font-medium text-brand underline underline-offset-4"
        >
          Took it? Write the first one.
        </Link>
      ) : null}
    </li>
  );
}
