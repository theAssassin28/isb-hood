import { describe, expect, it } from "vitest";
import {
  applyFilters,
  parseFilters,
  termsOffered,
  toCard,
  type CourseCard,
} from "@/lib/domain/courseList";
import { review } from "../fixtures/reviews";

const course = (id: string, title: string) => ({
  id,
  code: id.toUpperCase(),
  title,
  open_to_readers: true,
});
const current = (professor: string, term = "Term 7") => ({
  id: `o-${professor}`,
  professor,
  term_label: term,
  cohort_year: "Co'27",
  is_current: true,
  status: "approved" as const,
});

const cards: CourseCard[] = [
  toCard(
    course("mkt", "Pricing"),
    [current("Prof A")],
    [
      review({
        professor: "Prof A",
        workload_band: "2-4",
        quant_qual: 2,
        learning_value: 3,
        careers_helped: ["marketing"],
      }),
    ],
  ),
  toCard(
    course("fin", "Valuation"),
    [current("Prof B")],
    [
      review({ professor: "Prof B", workload_band: "6+", quant_qual: 5, learning_value: 5 }),
      review({
        professor: "Prof B",
        workload_band: "4-6",
        quant_qual: 4,
        learning_value: 5,
        careers_helped: ["finance"],
      }),
    ],
  ),
  toCard(course("neg", "Negotiation"), [current("Prof C", "Term 5")], []),
  toCard(
    course("ops", "Operations"),
    [],
    [review({ workload_band: "2-4" }), review({ workload_band: "4-6" })],
  ),
];

describe("toCard", () => {
  it("summarises a course for the list", () => {
    expect(cards[1]).toMatchObject({
      reviewCount: 2,
      quantQual: "quant",
      learningMedian: 5,
      flag: null,
      tracks: ["finance"],
      current: { professor: "Prof B", term_label: "Term 7" },
    });
    expect(cards[1].workload?.label).toBe("4+ h");
  });

  it("marks a course with no reviews as new", () => {
    expect(cards[2].flag).toBe("new");
    expect(cards[2].workload).toBeNull();
  });

  it("finds a course by a past professor's name", () => {
    const card = toCard(
      course("x", "X"),
      [current("Prof New"), { ...current("Prof Old"), is_current: false }],
      [],
    );
    expect(card.haystack).toContain("prof old");
  });
});

describe("parseFilters", () => {
  it("defaults the term in bid season and notes it is a default", () => {
    const { filters, chosen, termIsDefault } = parseFilters({}, "Term 7");
    expect(filters.term).toBe("Term 7");
    expect(termIsDefault).toBe(true);
    expect(chosen).toEqual([]);
  });

  it("does not apply the default term to a search", () => {
    const { filters, termIsDefault } = parseFilters({ q: "valuation" }, "Term 7");
    expect(filters.term).toBeNull();
    expect(termIsDefault).toBe(false);
  });

  it("lets the reader turn the default term off", () => {
    expect(parseFilters({ term: "all" }, "Term 7").filters.term).toBeNull();
  });

  it("records which filters the reader chose", () => {
    const { chosen } = parseFilters(
      {
        q: "val",
        term: "Term 5",
        workload: "2-4",
        qq: "quant",
        track: "finance",
        sort: "learning",
      },
      null,
    );
    expect(chosen).toEqual(["search", "term", "workload", "quant_qual", "track"]);
  });

  it("drops values that are not in the vocabularies", () => {
    const { filters, chosen } = parseFilters(
      { term: "Term 99", workload: "lots", qq: "maths", track: "astronaut", sort: "random" },
      null,
    );
    expect(filters).toMatchObject({
      term: null,
      workload: null,
      qq: null,
      track: null,
      sort: "reviews",
    });
    expect(chosen).toEqual([]);
  });

  it("caps a very long search", () => {
    expect(parseFilters({ q: "x".repeat(500) }, null).filters.q).toHaveLength(80);
  });
});

describe("applyFilters", () => {
  const base = parseFilters({}, null).filters;
  const titles = (list: CourseCard[]) => list.map((c) => c.title);

  it("sorts by review count by default, then by title", () => {
    expect(titles(applyFilters(cards, base))).toEqual([
      "Operations",
      "Valuation",
      "Pricing",
      "Negotiation",
    ]);
  });

  it("sorts by learning value with unreviewed courses last", () => {
    expect(titles(applyFilters(cards, { ...base, sort: "learning" }))).toEqual([
      "Valuation",
      "Operations",
      "Pricing",
      "Negotiation",
    ]);
  });

  it("searches title, code and professor, ignoring case", () => {
    expect(titles(applyFilters(cards, { ...base, q: "PROF b" }))).toEqual(["Valuation"]);
    expect(titles(applyFilters(cards, { ...base, q: "neg" }))).toEqual(["Negotiation"]);
  });

  it("filters by the term of the current offering", () => {
    expect(titles(applyFilters(cards, { ...base, term: "Term 5" }))).toEqual(["Negotiation"]);
  });

  it("matches a workload band anywhere inside a straddling median", () => {
    // Operations straddles 2-4 and 4-6.
    expect(titles(applyFilters(cards, { ...base, workload: "4-6" }))).toEqual([
      "Operations",
      "Valuation",
    ]);
    expect(titles(applyFilters(cards, { ...base, workload: "2-4" }))).toEqual([
      "Operations",
      "Pricing",
    ]);
  });

  it("filters by quant or qual and by track", () => {
    expect(titles(applyFilters(cards, { ...base, qq: "qual" }))).toEqual(["Pricing"]);
    expect(titles(applyFilters(cards, { ...base, track: "finance" }))).toEqual(["Valuation"]);
  });
});

describe("termsOffered", () => {
  it("lists terms with a current offering, in term order", () => {
    expect(termsOffered(cards)).toEqual(["Term 5", "Term 7"]);
  });
});
