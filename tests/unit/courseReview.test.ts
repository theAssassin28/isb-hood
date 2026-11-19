import { describe, expect, it } from "vitest";
import {
  EMPTY_REVIEW,
  errorsForStep,
  firstIncompleteStep,
  fromRow,
  parseDraft,
  STEPS,
  toDraftRow,
  toPublishedRow,
  validateReview,
  type ReviewFields,
} from "@/lib/schemas/courseReview";

const complete: ReviewFields = {
  why_taken: ["interest", "career_fit"],
  workload_band: "4-6",
  eval_participation: 20,
  eval_quizzes: null,
  eval_individual: 20,
  eval_group: 30,
  eval_midterm: null,
  eval_final: 30,
  outline_gap: "The group project has four graded sub-parts the outline never mentions.",
  quant_qual: 4,
  teaching_styles: ["case_discussion"],
  grade_risk: "high",
  grade_risk_reason: "Tight curve.",
  learning_value: 5,
  learning_value_reason: "Every case maps to a pricing decision I have since had to make at work.",
  careers_helped: [],
  who_should_take: "Anyone going into product or marketing.",
  who_should_skip: "",
  outline_match: "partly",
  visibility: "anonymous",
  open_to_questions: true,
};

describe("validateReview", () => {
  it("accepts a complete review and treats blank mix parts as zero", () => {
    const result = validateReview(complete);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.eval_quizzes).toBe(0);
  });

  it("reports every missing answer on an empty form", () => {
    const result = validateReview(EMPTY_REVIEW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    for (const key of [
      "why_taken",
      "workload_band",
      "eval_total",
      "grade_risk",
      "grade_risk_reason",
      "outline_match",
      "quant_qual",
      "teaching_styles",
      "outline_gap",
      "learning_value",
      "learning_value_reason",
      "who_should_take",
    ] as const) {
      expect(result.errors[key], key).toBeTruthy();
    }
  });

  it("will not accept a rating without a real reason", () => {
    const result = validateReview({ ...complete, learning_value_reason: "Good course." });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.learning_value_reason).toMatch(/at least 40/);
  });

  it("does not count padding spaces towards the 40 characters", () => {
    const result = validateReview({ ...complete, outline_gap: `short${" ".repeat(60)}` });
    expect(result.ok).toBe(false);
  });

  it("says what the mix adds up to when it is not 100", () => {
    const result = validateReview({ ...complete, eval_final: 40 });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.eval_total).toBe("The mix adds up to 110. It needs to total 100.");
  });

  it("needs at least one of take and skip, and either will do", () => {
    expect(validateReview({ ...complete, who_should_take: "  " }).ok).toBe(false);
    expect(
      validateReview({ ...complete, who_should_take: "", who_should_skip: "Pure quant people." })
        .ok,
    ).toBe(true);
  });

  it("rejects values outside the vocabularies", () => {
    expect(validateReview({ ...complete, why_taken: ["bribery"] }).ok).toBe(false);
    expect(validateReview({ ...complete, quant_qual: 9 }).ok).toBe(false);
  });
});

describe("steps", () => {
  it("cover every field that can have an error, exactly once", () => {
    const result = validateReview(EMPTY_REVIEW);
    if (result.ok) throw new Error("expected errors");
    const inSteps = STEPS.flatMap((s) => [...s.fields]);
    expect(new Set(inSteps).size).toBe(inSteps.length);
    for (const key of Object.keys(result.errors)) expect(inSteps, key).toContain(key);
  });

  it("show only their own errors", () => {
    const result = validateReview(EMPTY_REVIEW);
    if (result.ok) throw new Error("expected errors");
    expect(Object.keys(errorsForStep(result.errors, 0)).sort()).toEqual([
      "why_taken",
      "workload_band",
    ]);
  });

  it("resume a draft at the first step with something missing", () => {
    expect(firstIncompleteStep(EMPTY_REVIEW)).toBe(0);
    expect(firstIncompleteStep({ ...complete, grade_risk: null })).toBe(1);
    expect(firstIncompleteStep({ ...complete, outline_gap: "" })).toBe(2);
    expect(firstIncompleteStep({ ...complete, who_should_take: "" })).toBe(3);
    expect(firstIncompleteStep(complete)).toBe(3);
  });
});

describe("storing and restoring", () => {
  it("round-trips a draft through its database row", () => {
    const partial: ReviewFields = { ...EMPTY_REVIEW, why_taken: ["grades"], eval_group: 40 };
    expect(fromRow(toDraftRow(partial))).toEqual(partial);
    expect(fromRow(toDraftRow(complete))).toEqual(complete);
  });

  it("stores empty answers as null, not empty strings", () => {
    const row = toDraftRow(EMPTY_REVIEW);
    expect(row.outline_gap).toBeNull();
    expect(row.why_taken).toBeNull();
  });

  it("trims text and nulls the unused take/skip line when publishing", () => {
    const result = validateReview({ ...complete, who_should_take: "  Product people.  " });
    if (!result.ok) throw new Error("expected ok");
    const row = toPublishedRow(result.data);
    expect(row.who_should_take).toBe("Product people.");
    expect(row.who_should_skip).toBeNull();
  });

  it("accepts an incomplete draft from the client but not a malformed one", () => {
    expect(parseDraft(EMPTY_REVIEW)).toEqual(EMPTY_REVIEW);
    expect(parseDraft({ ...EMPTY_REVIEW, eval_final: 250 })).toBeNull();
    expect(parseDraft({ ...EMPTY_REVIEW, visibility: "public" })).toBeNull();
    expect(parseDraft({ ...EMPTY_REVIEW, outline_gap: "x".repeat(5000) })).toBeNull();
    expect(parseDraft("nonsense")).toBeNull();
  });

  it("drops fields the form does not own, such as status or author", () => {
    const parsed = parseDraft({ ...EMPTY_REVIEW, status: "live", author_id: "someone" });
    expect(parsed).not.toHaveProperty("status");
    expect(parsed).not.toHaveProperty("author_id");
  });
});
