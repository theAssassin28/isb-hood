// Course page summary and "New or changed" banner (docs/BUILD_PLAN.md 6.1, 6.2).
// Pure functions over live reviews, so every rule is unit-tested and the course
// list and the course page can never disagree about a number.

import {
  CAREER_PATHS,
  careerLabel,
  EVALUATION_COMPONENTS,
  TRACKS,
  WORKLOAD_BANDS,
} from "@/lib/constants/vocab";
import type { EvalKey } from "@/lib/schemas/courseReview";

/** The fields of a live review the summary needs. */
export type AggReview = {
  id: string;
  offering_id: string;
  professor: string;
  term_label: string;
  cohort_year: string;
  published_at: string | null;
  workload_band: string | null;
  quant_qual: number | null;
  learning_value: number | null;
  grade_risk: string | null;
  outline_match: string | null;
  who_should_take: string;
  who_should_skip: string;
  careers_helped: string[];
} & Record<EvalKey, number | null>;

export type AggOffering = {
  id: string;
  professor: string;
  term_label: string;
  cohort_year: string;
  is_current: boolean;
  status: "approved" | "pending";
};

/** Below this many reviews: no agreement level, and a "Based on N" caution. */
export const MIN_REVIEWS_FOR_CONFIDENCE = 3;
/** Agreement is High when this share of ratings sits within one point of the median. */
export const HIGH_AGREEMENT_SHARE = 0.7;
const TOP_LINES = 3;

// ------------------------------------------------------------------ helpers

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const newestFirst = (a: AggReview, b: AggReview) =>
  (b.published_at ?? "").localeCompare(a.published_at ?? "") || a.id.localeCompare(b.id);

export const normaliseName = (name: string) =>
  name.normalize("NFKD").replace(/[̀-ͯ]/g, "").trim().toLowerCase().replace(/\s+/g, " ");

// ---------------------------------------------------------------- workload

export type WorkloadSummary = {
  /** For example "2-4 h", "2-6 h" or "4+ h". */
  label: string;
  /** Band indexes the median spans (equal unless the median straddles two bands). */
  low: number;
  high: number;
};

const BAND_BOUNDS: [number, number | null][] = [
  [0, 2],
  [2, 4],
  [4, 6],
  [6, null],
];

/** Median band of an ordinal scale. An even count straddling two bands gives a range. */
export function workloadMedian(bands: (string | null)[]): WorkloadSummary | null {
  const indexes = bands
    .map((band) => WORKLOAD_BANDS.indexOf(band as (typeof WORKLOAD_BANDS)[number]))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);
  if (indexes.length === 0) return null;
  const n = indexes.length;
  const low = n % 2 === 1 ? indexes[(n - 1) / 2] : indexes[n / 2 - 1];
  const high = n % 2 === 1 ? low : indexes[n / 2];
  const from = BAND_BOUNDS[low][0];
  const to = BAND_BOUNDS[high][1];
  return { label: to === null ? `${from}+ h` : `${from}-${to} h`, low, high };
}

// ------------------------------------------------------------ evaluation mix

export type MixPart = { key: EvalKey; label: string; percent: number };

/**
 * Mean of each component, rounded so the parts still total exactly 100
 * (largest remainder). Parts at zero are dropped. Order is fixed, so a
 * component keeps its colour on every course page.
 */
export function evaluationMix(reviews: Pick<AggReview, EvalKey>[]): MixPart[] | null {
  if (reviews.length === 0) return null;
  const means = EVALUATION_COMPONENTS.map(({ value }) => {
    const sum = reviews.reduce((total, r) => total + (r[value] ?? 0), 0);
    return sum / reviews.length;
  });
  const total = means.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const scaled = means.map((m) => (m / total) * 100);
  const floors = scaled.map(Math.floor);
  let remaining = 100 - floors.reduce((a, b) => a + b, 0);
  const order = scaled
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const { index } of order) {
    if (remaining <= 0) break;
    floors[index] += 1;
    remaining -= 1;
  }
  return EVALUATION_COMPONENTS.map((c, i) => ({
    key: c.value,
    label: c.label,
    percent: floors[i],
  })).filter((part) => part.percent > 0);
}

// ------------------------------------------------------------- quant / qual

export type QuantQualBucket = "qual" | "balanced" | "quant";

export function quantQualBucket(mean: number): QuantQualBucket {
  if (mean < 2.5) return "qual";
  if (mean > 3.5) return "quant";
  return "balanced";
}

export const QUANT_QUAL_LABEL: Record<QuantQualBucket, string> = {
  qual: "Mostly qual",
  balanced: "Balanced",
  quant: "Mostly quant",
};

export function quantQualMean(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => typeof v === "number");
  if (present.length === 0) return null;
  return Math.round((present.reduce((a, b) => a + b, 0) / present.length) * 10) / 10;
}

// ---------------------------------------------------------- learning value

export type Agreement = "high" | "mixed";

export function learningValue(
  values: (number | null)[],
): { median: number; agreement: Agreement | null } | null {
  const present = values.filter((v): v is number => typeof v === "number");
  const mid = median(present);
  if (mid === null) return null;
  if (present.length < MIN_REVIEWS_FOR_CONFIDENCE) return { median: mid, agreement: null };
  const close = present.filter((v) => Math.abs(v - mid) <= 1).length;
  return {
    median: mid,
    agreement: close / present.length >= HIGH_AGREEMENT_SHARE ? "high" : "mixed",
  };
}

// --------------------------------------------------------------- summary

export type Line = { reviewId: string; text: string; offering: string };

export type CourseSummary = {
  count: number;
  offeringCount: number;
  lowConfidence: boolean;
  workload: WorkloadSummary | null;
  mix: MixPart[] | null;
  quantQual: { mean: number; label: string } | null;
  gradeRisk: { low: number; medium: number; high: number };
  learning: { median: number; agreement: Agreement | null } | null;
  outline: { yes: number; partly: number; no: number; yesPercent: number } | null;
  take: Line[];
  skip: Line[];
  takeTotal: number;
  skipTotal: number;
  /** Career paths reviewers said the course helps, most named first. */
  careers: CareerCount[];
};

export type CareerCount = { track: string; label: string; count: number };

/** Vocabulary order: specific paths first, then bare tracks (older reviews). */
const CAREER_ORDER: string[] = [...CAREER_PATHS.map((p) => p.value), ...TRACKS.map((t) => t.value)];

/**
 * How many reviews named each career path ("Careers it helps"), most named
 * first; ties keep the vocabulary order so the list never reshuffles.
 */
export function careerCounts(reviews: Pick<AggReview, "careers_helped">[]): CareerCount[] {
  const counts = new Map<string, number>();
  for (const review of reviews) {
    for (const value of new Set(review.careers_helped)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  const rank = (v: string) => {
    const i = CAREER_ORDER.indexOf(v);
    return i === -1 ? CAREER_ORDER.length : i;
  };
  return [...counts.entries()]
    .map(([track, count]) => ({ track, label: careerLabel(track), count }))
    .sort((a, b) => b.count - a.count || rank(a.track) - rank(b.track));
}

function topLines(reviews: AggReview[], key: "who_should_take" | "who_should_skip") {
  const all = [...reviews]
    .sort(newestFirst)
    .filter((r) => r[key].trim() !== "")
    .map((r) => ({
      reviewId: r.id,
      text: r[key].trim(),
      offering: `${r.professor}, ${r.term_label} ${r.cohort_year}`,
    }));
  // One review is one author for that offering, so distinct reviews are distinct
  // authors. (Anonymous authors cannot be told apart, by design.)
  return { lines: all.slice(0, TOP_LINES), total: all.length };
}

export function summarise(reviews: AggReview[]): CourseSummary {
  const take = topLines(reviews, "who_should_take");
  const skip = topLines(reviews, "who_should_skip");
  const qq = quantQualMean(reviews.map((r) => r.quant_qual));
  const outlineAnswers = reviews.map((r) => r.outline_match).filter(Boolean);
  const yes = outlineAnswers.filter((a) => a === "yes").length;

  return {
    count: reviews.length,
    offeringCount: new Set(reviews.map((r) => r.offering_id)).size,
    lowConfidence: reviews.length < MIN_REVIEWS_FOR_CONFIDENCE,
    workload: workloadMedian(reviews.map((r) => r.workload_band)),
    mix: evaluationMix(reviews),
    quantQual: qq === null ? null : { mean: qq, label: QUANT_QUAL_LABEL[quantQualBucket(qq)] },
    gradeRisk: {
      low: reviews.filter((r) => r.grade_risk === "low").length,
      medium: reviews.filter((r) => r.grade_risk === "medium").length,
      high: reviews.filter((r) => r.grade_risk === "high").length,
    },
    learning: learningValue(reviews.map((r) => r.learning_value)),
    outline:
      outlineAnswers.length === 0
        ? null
        : {
            yes,
            partly: outlineAnswers.filter((a) => a === "partly").length,
            no: outlineAnswers.filter((a) => a === "no").length,
            yesPercent: Math.round((yes / outlineAnswers.length) * 100),
          },
    take: take.lines,
    skip: skip.lines,
    takeTotal: take.total,
    skipTotal: skip.total,
    careers: careerCounts(reviews),
  };
}

// ---------------------------------------------------------------- banner

export type OfferingRef = { professor: string; term_label: string; cohort_year: string };

export type Banner =
  { kind: "new" } | { kind: "changed"; reviewedFor: OfferingRef; current: OfferingRef } | null;

export function currentOffering(offerings: AggOffering[]): AggOffering | null {
  return offerings.find((o) => o.is_current && o.status === "approved") ?? null;
}

/**
 * "New or changed course": no live reviews at all, or none for the professor
 * teaching it now. Compared by professor name, so a re-run by the same person
 * in a new term is not flagged.
 */
export function newOrChanged(offerings: AggOffering[], reviews: AggReview[]): Banner {
  if (reviews.length === 0) return { kind: "new" };
  const current = currentOffering(offerings);
  if (!current) return null;
  const teacher = normaliseName(current.professor);
  if (reviews.some((r) => normaliseName(r.professor) === teacher)) return null;
  const latest = [...reviews].sort(newestFirst)[0];
  return {
    kind: "changed",
    reviewedFor: {
      professor: latest.professor,
      term_label: latest.term_label,
      cohort_year: latest.cohort_year,
    },
    current: {
      professor: current.professor,
      term_label: current.term_label,
      cohort_year: current.cohort_year,
    },
  };
}

/** Reviews of the professor teaching the course now, for the "This professor only" switch. */
export function currentProfessorReviews(
  offerings: AggOffering[],
  reviews: AggReview[],
): AggReview[] {
  const current = currentOffering(offerings);
  if (!current) return [];
  const teacher = normaliseName(current.professor);
  return reviews.filter((r) => normaliseName(r.professor) === teacher);
}
