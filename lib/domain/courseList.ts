// Course list cards, filters and sort (docs/BUILD_PLAN.md 4.3). Pure.

import { TRACKS, trackOfCareer, WORKLOAD_BANDS } from "@/lib/constants/vocab";
import {
  careerCounts,
  currentOffering,
  learningValue,
  newOrChanged,
  quantQualBucket,
  quantQualMean,
  workloadMedian,
  type AggOffering,
  type AggReview,
  type QuantQualBucket,
  type WorkloadSummary,
} from "./aggregation";

export type CourseCard = {
  id: string;
  code: string;
  title: string;
  hiddenFromReaders: boolean;
  current: { professor: string; term_label: string } | null;
  reviewCount: number;
  workload: WorkloadSummary | null;
  quantQual: QuantQualBucket | null;
  learningMedian: number | null;
  flag: "new" | "changed" | null;
  tracks: string[];
  /** Lower-cased title, code and every professor who has taught it. */
  haystack: string;
};

export function toCard(
  course: { id: string; code: string; title: string; open_to_readers: boolean },
  offerings: AggOffering[],
  reviews: AggReview[],
): CourseCard {
  const approved = offerings.filter((o) => o.status === "approved");
  const current = currentOffering(approved);
  const qq = quantQualMean(reviews.map((r) => r.quant_qual));
  const banner = newOrChanged(approved, reviews);
  return {
    id: course.id,
    code: course.code,
    title: course.title,
    hiddenFromReaders: !course.open_to_readers,
    current: current ? { professor: current.professor, term_label: current.term_label } : null,
    reviewCount: reviews.length,
    workload: workloadMedian(reviews.map((r) => r.workload_band)),
    quantQual: qq === null ? null : quantQualBucket(qq),
    learningMedian: learningValue(reviews.map((r) => r.learning_value))?.median ?? null,
    flag: banner?.kind ?? null,
    // Most named first, so the card shows the strongest fits first.
    tracks: careerCounts(reviews).map((c) => c.track),
    haystack: [course.title, course.code, ...approved.map((o) => o.professor)]
      .join(" ")
      .toLowerCase(),
  };
}

export type Sort = "reviews" | "learning";

export type Filters = {
  q: string;
  /** null means all terms. */
  term: string | null;
  workload: (typeof WORKLOAD_BANDS)[number] | null;
  qq: QuantQualBucket | null;
  track: string | null;
  sort: Sort;
};

/** Which filters the reader chose in the URL (not defaults), for `filter_used`. */
export type FilterName = "search" | "term" | "workload" | "quant_qual" | "track";

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : Array.isArray(value) ? value[0] : undefined;

/**
 * Reads filters from the URL, dropping anything not in the vocabularies.
 * With no `term` in the URL, `defaultTerm` applies (the bid term in bid season)
 * unless the reader is searching; `term=all` turns it off.
 */
export function parseFilters(
  params: Params,
  defaultTerm: string | null,
): { filters: Filters; chosen: FilterName[]; termIsDefault: boolean } {
  const chosen: FilterName[] = [];

  const q = (one(params.q) ?? "").trim().slice(0, 80);
  if (q !== "") chosen.push("search");

  const rawTerm = one(params.term);
  let term: string | null;
  let termIsDefault = false;
  if (rawTerm === undefined || rawTerm === "") {
    // A search looks across every term; the bid-season default would hide results.
    term = q === "" ? defaultTerm : null;
    termIsDefault = term !== null;
  } else if (rawTerm === "all") {
    term = null;
  } else if (/^Term [1-8]$/.test(rawTerm)) {
    term = rawTerm;
    chosen.push("term");
  } else {
    term = null;
  }

  const rawWorkload = one(params.workload);
  const workload = (WORKLOAD_BANDS as readonly string[]).includes(rawWorkload ?? "")
    ? (rawWorkload as Filters["workload"])
    : null;
  if (workload) chosen.push("workload");

  const rawQq = one(params.qq);
  const qq = rawQq === "qual" || rawQq === "balanced" || rawQq === "quant" ? rawQq : null;
  if (qq) chosen.push("quant_qual");

  const rawTrack = one(params.track);
  const track = TRACKS.some((t) => t.value === rawTrack) ? (rawTrack as string) : null;
  if (track) chosen.push("track");

  const sort: Sort = one(params.sort) === "learning" ? "learning" : "reviews";

  return { filters: { q, term, workload, qq, track, sort }, chosen, termIsDefault };
}

export function applyFilters(cards: CourseCard[], filters: Filters): CourseCard[] {
  const needle = filters.q.toLowerCase();
  const band = filters.workload ? WORKLOAD_BANDS.indexOf(filters.workload) : -1;

  const kept = cards.filter((card) => {
    if (needle && !card.haystack.includes(needle)) return false;
    if (filters.term && card.current?.term_label !== filters.term) return false;
    if (band >= 0 && !(card.workload && card.workload.low <= band && band <= card.workload.high)) {
      return false;
    }
    if (filters.qq && card.quantQual !== filters.qq) return false;
    // "Helps for" is a track; a card lists specific paths, each under a track.
    if (filters.track && !card.tracks.some((v) => trackOfCareer(v) === filters.track)) return false;
    return true;
  });

  return kept.sort((a, b) => {
    if (filters.sort === "learning") {
      const la = a.learningMedian ?? -1;
      const lb = b.learningMedian ?? -1;
      if (la !== lb) return lb - la;
    }
    return b.reviewCount - a.reviewCount || a.title.localeCompare(b.title);
  });
}

/** Terms with a current offering, for the term filter. */
export function termsOffered(cards: CourseCard[]): string[] {
  return [...new Set(cards.map((c) => c.current?.term_label).filter((t): t is string => !!t))].sort(
    (a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")),
  );
}
