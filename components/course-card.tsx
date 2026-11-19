import Link from "next/link";
import { QUANT_QUAL_LABEL } from "@/lib/domain/aggregation";
import type { CourseCard } from "@/lib/domain/courseList";
import { cardFrame } from "./styles";

const tag = "type-tag";

export function CourseCardItem({ course }: { course: CourseCard }) {
  return (
    <li className={cardFrame}>
      <Link href={`/courses/${course.id}`} className="block rounded-lg p-5 hover:bg-background">
        <span className="block font-semibold text-foreground">{course.title}</span>
        <span className="block text-sm text-muted-foreground">
          {course.code}
          {course.current ? ` · ${course.current.professor}, ${course.current.term_label}` : ""}
        </span>
        <span className="mt-2 flex flex-wrap gap-1.5">
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
