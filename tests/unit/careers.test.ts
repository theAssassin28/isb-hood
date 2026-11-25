import { describe, expect, it } from "vitest";
import { CAREER_PATHS, careerLabel, TRACKS, trackOfCareer } from "@/lib/constants/vocab";
import { careerCounts } from "@/lib/domain/aggregation";
import { applyFilters, parseFilters, toCard } from "@/lib/domain/courseList";
import { review } from "../fixtures/reviews";

describe("career paths", () => {
  it("every path belongs to a known track", () => {
    const tracks = new Set<string>(TRACKS.map((t) => t.value));
    for (const path of CAREER_PATHS) expect(tracks.has(path.track)).toBe(true);
  });

  it("labels and tracks work for paths and for older bare tracks", () => {
    expect(careerLabel("investment_banking")).toBe("Investment banking");
    expect(trackOfCareer("investment_banking")).toBe("finance");
    expect(careerLabel("finance")).toBe("Finance");
    expect(trackOfCareer("finance")).toBe("finance");
    expect(trackOfCareer("not_a_path")).toBeNull();
  });

  it("counts each review once per path, most named first, ties in vocabulary order", () => {
    const counts = careerCounts([
      { careers_helped: ["fpa", "investment_banking"] },
      { careers_helped: ["investment_banking", "investment_banking"] },
      { careers_helped: ["corporate_finance"] },
    ]);
    expect(counts.map((c) => [c.track, c.count])).toEqual([
      ["investment_banking", 2],
      ["corporate_finance", 1],
      ["fpa", 1],
    ]);
  });

  it("the Helps for filter (a track) matches courses tagged with its specific paths", () => {
    const course = { id: "fin", code: "FIN", title: "Valuation", open_to_readers: true };
    const card = toCard(course, [], [review({ careers_helped: ["fpa"] })]);
    const { filters } = parseFilters({ track: "finance", term: "all" }, null);
    expect(applyFilters([card], filters)).toHaveLength(1);
    const { filters: other } = parseFilters({ track: "marketing", term: "all" }, null);
    expect(applyFilters([card], other)).toHaveLength(0);
  });
});
