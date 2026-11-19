import type { AggReview } from "@/lib/domain/aggregation";

// A live review with sensible defaults; override what a test is about.
let seq = 0;
export function review(over: Partial<AggReview> = {}): AggReview {
  seq += 1;
  return {
    id: `r${String(seq).padStart(3, "0")}`,
    offering_id: "o-old",
    professor: "Prof A",
    term_label: "Term 7",
    cohort_year: "Co'26",
    published_at: `2026-12-${String((seq % 28) + 1).padStart(2, "0")}T10:00:00Z`,
    workload_band: "2-4",
    quant_qual: 3,
    learning_value: 4,
    grade_risk: "medium",
    outline_match: "yes",
    who_should_take: "",
    who_should_skip: "",
    careers_helped: [],
    eval_participation: 20,
    eval_quizzes: 0,
    eval_individual: 20,
    eval_group: 30,
    eval_midterm: 0,
    eval_final: 30,
    ...over,
  };
}
