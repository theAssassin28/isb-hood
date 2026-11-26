import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CoursePageView, type CoursePageViewProps } from "@/components/course-page-view";
import { newOrChanged, summarise, type AggOffering } from "@/lib/domain/aggregation";
import type { PublicReview } from "@/lib/domain/publicReview";
import { EMPTY_REVIEW } from "@/lib/schemas/courseReview";

// The M3 "done when" fixtures (docs/BUILD_PLAN.md, M3): a course with 3+
// reviews, one with 2, one with none, one with a changed professor, and an
// anonymous author who must not be identifiable in the rendered page.

const COURSE = { id: "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b", code: "MKT-501", title: "Pricing" };

let seq = 0;
function live(over: Partial<PublicReview> = {}): PublicReview {
  seq += 1;
  return {
    ...EMPTY_REVIEW,
    why_taken: ["interest"],
    workload_band: "2-4",
    eval_participation: 20,
    eval_quizzes: 0,
    eval_individual: 20,
    eval_group: 30,
    eval_midterm: 0,
    eval_final: 30,
    outline_gap: "Four graded sub-parts in the group project that the outline never lists.",
    quant_qual: 3,
    teaching_styles: ["case_discussion"],
    grade_risk: "medium",
    grade_risk_reason: "Tight curve.",
    learning_value: 4,
    learning_value_reason: "The cases map closely to real pricing decisions in consumer goods.",
    who_should_take: `Take line ${seq}`,
    outline_match: "yes",
    id: `review-${seq}`,
    course_id: COURSE.id,
    offering_id: "offering-old",
    professor: "Prof A",
    term_label: "Term 7",
    cohort_year: "Co'26",
    published_at: `2026-12-${String(seq).padStart(2, "0")}T10:00:00Z`,
    is_edited: false,
    author_display: "Ravi Menon, Co'26",
    entered_by_team: false,
    is_mine: false,
    ...over,
  };
}

const offering = (over: Partial<AggOffering>): AggOffering => ({
  id: "offering-old",
  professor: "Prof A",
  term_label: "Term 7",
  cohort_year: "Co'26",
  is_current: false,
  status: "approved",
  ...over,
});

function render(
  reviews: PublicReview[],
  offerings: AggOffering[],
  extra: Partial<CoursePageViewProps> = {},
) {
  const current = offerings.find((o) => o.is_current) ?? null;
  const props: CoursePageViewProps = {
    course: { ...COURSE, hiddenFromReaders: false },
    current,
    banner: newOrChanged(offerings, reviews),
    summary: summarise(reviews),
    reviews,
    scope: "all",
    totalCount: reviews.length,
    currentProfessorCount: reviews.length,
    myReviewId: null,
    ...extra,
  };
  // Text only, entities decoded, so assertions read like the page.
  return renderToString(<CoursePageView {...props} />)
    .replace(/<!-- -->/g, "")
    .replace(/<\/?(?:span|a|strong)\b[^>]*>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

const sameProf = [offering({ id: "offering-now", cohort_year: "Co'27", is_current: true })];

describe("course page", () => {
  it("with 3+ reviews: full summary, agreement level, no caution, no banner", () => {
    const text = render([live(), live(), live({ learning_value: 5 })], sameProf);
    expect(text).toContain("3 reviews");
    expect(text).toContain("2-4 h");
    expect(text).toContain("4 of 5");
    expect(text).toContain("High agreement");
    expect(text).toContain("Low 0 · Medium 3 · High 0");
    expect(text).toContain("100% said the outline matched");
    expect(text).toContain("Class participation 20%");
    expect(text).not.toContain("Based on");
    expect(text).not.toContain("New or changed course");
    expect(text).not.toContain("No reviews yet");
  });

  it("with 2 reviews: the caution, and no agreement level", () => {
    const text = render([live(), live()], sameProf);
    expect(text).toContain("Based on 2 reviews.");
    expect(text).toContain("Too few reviews to show agreement");
    expect(text).not.toContain("High agreement");
  });

  it("with 1 review: singular wording", () => {
    expect(render([live()], sameProf)).toContain("Based on 1 review.");
  });

  it("with no reviews: the 'no reviews yet' message, no summary, one way to write the first", () => {
    const text = render([], sameProf);
    expect(text).toContain("No reviews yet");
    expect(text).not.toContain("What reviewers say");
    expect(text.match(/Add your review/g)).toHaveLength(1);
  });

  it("with a changed professor: the banner names both", () => {
    const offerings = [
      offering({}),
      offering({ id: "offering-now", professor: "Prof B", cohort_year: "Co'27", is_current: true }),
    ];
    const text = render([live(), live(), live()], offerings);
    expect(text).toContain("New or changed course");
    expect(text).toContain(
      "Reviews below are for Prof A (Term 7, Co'26). Workload and grading may differ with Prof B.",
    );
  });

  it("shows an anonymous author only as their cohort", () => {
    const text = render(
      [live({ author_display: "Verified Co'26 student", visibility: "anonymous" })],
      sameProf,
    );
    expect(text).toContain("Verified Co'26 student");
    expect(text).not.toContain("Ravi");
  });

  it("offers the 'this professor only' switch once they have 3+ reviews among others", () => {
    const offerings = [
      offering({}),
      offering({ id: "offering-now", professor: "Prof B", cohort_year: "Co'27", is_current: true }),
    ];
    const reviews = [
      live(),
      live({ professor: "Prof B" }),
      live({ professor: "Prof B" }),
      live({ professor: "Prof B" }),
    ];
    const text = render(reviews, offerings, { currentProfessorCount: 3 });
    expect(text).toContain("All reviews (4)");
    expect(text).toContain("Prof B only (3)");
    expect(render(reviews, offerings, { currentProfessorCount: 2 })).not.toContain("Prof B only");
  });

  it("turns the footer into 'Edit your review' for the reader's own review", () => {
    const mine = live({ is_mine: true });
    const text = render([mine], sameProf, { myReviewId: mine.id });
    expect(text).toContain("Your review");
    expect(text).toContain("Edit your review");
  });

  it("notes a review the team entered for someone", () => {
    expect(render([live({ entered_by_team: true })], sameProf)).toContain(
      "Entered by the ISB Hood team",
    );
  });
});
