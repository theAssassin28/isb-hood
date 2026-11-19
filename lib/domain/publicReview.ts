// A live review as readers get it from course_reviews_public. Shared by
// server and client code. The mapper keeps an explicit allowlist of keys, so
// nothing identifying can ride along even if the view gains a column.

import { fromRow, REVIEW_COLUMNS, type ReviewFields } from "@/lib/schemas/courseReview";

export type PublicReview = ReviewFields & {
  id: string;
  course_id: string;
  offering_id: string;
  professor: string;
  term_label: string;
  cohort_year: string;
  published_at: string | null;
  is_edited: boolean;
  /** "Asha Rao, Co'26" or "Verified Co'26 student". Never an id or email. */
  author_display: string;
  entered_by_team: boolean;
  is_mine: boolean;
};

/** Columns read from the view. `author_id` is deliberately not one of them. */
export const PUBLIC_REVIEW_COLUMNS =
  "id, course_id, offering_id, professor, term_label, cohort_year, published_at, is_edited, " +
  `author_display, entered_by_team, is_mine, ${REVIEW_COLUMNS}`;

export function toPublicReview(row: Record<string, unknown>): PublicReview {
  const text = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    ...fromRow(row),
    id: text(row.id),
    course_id: text(row.course_id),
    offering_id: text(row.offering_id),
    professor: text(row.professor),
    term_label: text(row.term_label),
    cohort_year: text(row.cohort_year),
    published_at: typeof row.published_at === "string" ? row.published_at : null,
    is_edited: row.is_edited === true,
    author_display: text(row.author_display) || "ISB student",
    entered_by_team: row.entered_by_team === true,
    is_mine: row.is_mine === true,
  };
}
