import { describe, expect, it } from "vitest";
import {
  currentProfessorReviews,
  evaluationMix,
  learningValue,
  newOrChanged,
  quantQualBucket,
  quantQualMean,
  summarise,
  workloadMedian,
  type AggOffering,
} from "@/lib/domain/aggregation";
import { review } from "../fixtures/reviews";

const offering = (over: Partial<AggOffering>): AggOffering => ({
  id: "o",
  professor: "Prof A",
  term_label: "Term 7",
  cohort_year: "Co'27",
  is_current: false,
  status: "approved",
  ...over,
});

describe("workloadMedian", () => {
  it("is empty with no answers", () => {
    expect(workloadMedian([])).toBeNull();
    expect(workloadMedian([null, "nonsense"])).toBeNull();
  });

  it("takes the middle band of an odd count", () => {
    expect(workloadMedian(["0-2", "6+", "4-6"])?.label).toBe("4-6 h");
    expect(workloadMedian(["2-4"])?.label).toBe("2-4 h");
  });

  it("shows a range when an even count straddles two bands", () => {
    expect(workloadMedian(["2-4", "4-6"])).toEqual({ label: "2-6 h", low: 1, high: 2 });
    expect(workloadMedian(["0-2", "0-2", "4-6", "6+"])?.label).toBe("0-6 h");
  });

  it("keeps a single band when both middles agree", () => {
    expect(workloadMedian(["2-4", "2-4", "2-4", "6+"])?.label).toBe("2-4 h");
  });

  it("writes an open-ended top band as a plus", () => {
    expect(workloadMedian(["6+"])?.label).toBe("6+ h");
    expect(workloadMedian(["4-6", "6+"])?.label).toBe("4+ h");
  });
});

describe("evaluationMix", () => {
  it("averages each component and drops parts at zero", () => {
    const mix = evaluationMix([
      review({ eval_participation: 20, eval_individual: 20, eval_group: 30, eval_final: 30 }),
      review({ eval_participation: 40, eval_individual: 0, eval_group: 30, eval_final: 30 }),
    ]);
    expect(mix).toEqual([
      { key: "eval_participation", label: "Class participation", percent: 30 },
      { key: "eval_individual", label: "Individual work", percent: 10 },
      { key: "eval_group", label: "Group work", percent: 30 },
      { key: "eval_final", label: "Final", percent: 30 },
    ]);
  });

  it("rounds so the parts still total exactly 100", () => {
    const thirds = [
      review({ eval_participation: 100, eval_individual: 0, eval_group: 0, eval_final: 0 }),
      review({ eval_participation: 0, eval_individual: 100, eval_group: 0, eval_final: 0 }),
      review({ eval_participation: 0, eval_individual: 0, eval_group: 100, eval_final: 0 }),
    ];
    const mix = evaluationMix(thirds)!;
    expect(mix.reduce((sum, p) => sum + p.percent, 0)).toBe(100);
    // The extra point goes to the first component on a tie, so it is stable.
    expect(mix.map((p) => p.percent)).toEqual([34, 33, 33]);
  });

  it("is empty with no reviews", () => {
    expect(evaluationMix([])).toBeNull();
  });
});

describe("quant or qual", () => {
  it("is a mean to one decimal", () => {
    expect(quantQualMean([1, 2, 2])).toBe(1.7);
    expect(quantQualMean([null])).toBeNull();
  });

  it("buckets with the edges counted as balanced", () => {
    expect(quantQualBucket(2.4)).toBe("qual");
    expect(quantQualBucket(2.5)).toBe("balanced");
    expect(quantQualBucket(3.5)).toBe("balanced");
    expect(quantQualBucket(3.6)).toBe("quant");
  });
});

describe("learningValue", () => {
  it("has no agreement level below three ratings", () => {
    expect(learningValue([5, 1])).toEqual({ median: 3, agreement: null });
  });

  it("is High when 70% or more sit within one point of the median", () => {
    // median 4; 4, 4, 5, 3 are within one point; 1 is not: 4 of 5 = 80%.
    expect(learningValue([4, 4, 5, 3, 1])).toEqual({ median: 4, agreement: "high" });
  });

  it("is Mixed below 70%", () => {
    // median 3; 1 and 5 are two away: 1 of 3 = 33%.
    expect(learningValue([1, 3, 5])).toEqual({ median: 3, agreement: "mixed" });
  });

  it("uses the mean of the two middles for an even count", () => {
    expect(learningValue([2, 3, 4, 5])?.median).toBe(3.5);
  });

  it("counts exactly 70% as High", () => {
    // median 5; seven 5s and three 1s: 7 of 10.
    expect(learningValue([5, 5, 5, 5, 5, 5, 5, 1, 1, 1])?.agreement).toBe("high");
  });
});

describe("summarise", () => {
  it("handles a course with no reviews", () => {
    const s = summarise([]);
    expect(s).toMatchObject({
      count: 0,
      lowConfidence: true,
      workload: null,
      mix: null,
      learning: null,
      outline: null,
      take: [],
      skip: [],
    });
  });

  it("flags one and two reviews as low confidence", () => {
    expect(summarise([review()]).lowConfidence).toBe(true);
    expect(summarise([review(), review()]).lowConfidence).toBe(true);
    expect(summarise([review(), review(), review()]).lowConfidence).toBe(false);
  });

  it("splits grade risk and the outline answers", () => {
    const s = summarise([
      review({ grade_risk: "low", outline_match: "yes" }),
      review({ grade_risk: "high", outline_match: "no" }),
      review({ grade_risk: "high", outline_match: "partly" }),
      review({ grade_risk: "medium", outline_match: "yes" }),
    ]);
    expect(s.gradeRisk).toEqual({ low: 1, medium: 1, high: 2 });
    expect(s.outline).toEqual({ yes: 2, partly: 1, no: 1, yesPercent: 50 });
  });

  it("counts offerings the reviews come from", () => {
    const s = summarise([
      review({ offering_id: "a" }),
      review({ offering_id: "b" }),
      review({ offering_id: "a" }),
    ]);
    expect(s.offeringCount).toBe(2);
  });

  it("takes the three newest non-empty take and skip lines", () => {
    const s = summarise([
      review({ id: "a", published_at: "2026-12-01T00:00:00Z", who_should_take: "Oldest" }),
      review({ id: "b", published_at: "2026-12-05T00:00:00Z", who_should_take: "  Newest  " }),
      review({ id: "c", published_at: "2026-12-03T00:00:00Z", who_should_take: "Middle" }),
      review({ id: "d", published_at: "2026-12-04T00:00:00Z", who_should_take: "   " }),
      review({ id: "e", published_at: "2026-12-02T00:00:00Z", who_should_take: "Second oldest" }),
    ]);
    expect(s.take.map((l) => l.text)).toEqual(["Newest", "Middle", "Second oldest"]);
    expect(s.takeTotal).toBe(4);
    expect(s.take[0].offering).toBe("Prof A, Term 7 Co'26");
    expect(s.skip).toEqual([]);
  });
});

describe("newOrChanged", () => {
  const current = offering({ id: "o-new", professor: "Prof B", is_current: true });
  const past = offering({ id: "o-old", professor: "Prof A", cohort_year: "Co'26" });

  it("says new when there are no reviews", () => {
    expect(newOrChanged([current], [])).toEqual({ kind: "new" });
    expect(newOrChanged([], [])).toEqual({ kind: "new" });
  });

  it("says changed when no review is for the professor teaching it now", () => {
    expect(newOrChanged([past, current], [review({ professor: "Prof A" })])).toEqual({
      kind: "changed",
      reviewedFor: { professor: "Prof A", term_label: "Term 7", cohort_year: "Co'26" },
      current: { professor: "Prof B", term_label: "Term 7", cohort_year: "Co'27" },
    });
  });

  it("is quiet when the current professor has been reviewed, whatever the term", () => {
    expect(
      newOrChanged(
        [past, current],
        [review({ professor: "Prof A" }), review({ professor: " prof  b " })],
      ),
    ).toBeNull();
  });

  it("is quiet when the same professor teaches it again in a new term", () => {
    const rerun = offering({ id: "o-new", professor: "Prof A", is_current: true });
    expect(newOrChanged([past, rerun], [review({ professor: "Prof A" })])).toBeNull();
  });

  it("is quiet when nobody knows who teaches it now", () => {
    expect(newOrChanged([past], [review()])).toBeNull();
  });

  it("ignores a current offering that is only proposed", () => {
    const proposed = offering({ professor: "Prof Z", is_current: true, status: "pending" });
    expect(newOrChanged([past, proposed], [review()])).toBeNull();
  });

  it("names the most recently reviewed offering", () => {
    const banner = newOrChanged(
      [current],
      [
        review({ professor: "Prof A", cohort_year: "Co'25", published_at: "2026-01-01T00:00:00Z" }),
        review({ professor: "Prof C", cohort_year: "Co'26", published_at: "2026-12-01T00:00:00Z" }),
      ],
    );
    expect(banner?.kind === "changed" && banner.reviewedFor.professor).toBe("Prof C");
  });
});

describe("currentProfessorReviews", () => {
  it("keeps only reviews of whoever teaches it now", () => {
    const current = offering({ professor: "Prof B", is_current: true });
    const kept = currentProfessorReviews(
      [current],
      [review({ professor: "Prof A" }), review({ professor: "PROF B" })],
    );
    expect(kept.map((r) => r.professor)).toEqual(["PROF B"]);
    expect(currentProfessorReviews([], [review()])).toEqual([]);
  });
});
