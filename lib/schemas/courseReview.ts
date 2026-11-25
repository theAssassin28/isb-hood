import { z } from "zod";
import {
  CAREER_PATHS,
  EVALUATION_COMPONENTS,
  TEACHING_STYLES,
  TRACKS,
  WHY_TAKEN,
  WORKLOAD_BANDS,
} from "@/lib/constants/vocab";

// Course review (requirements 5.1; docs/BUILD_PLAN.md 5.2).
// One definition used by the form (per-step checks), the server action
// (full check before publish) and the preview. The database repeats the
// essential rules as a constraint, so nothing incomplete can be published.

export const MIN_REASON_CHARS = 40;
const MAX_TEXT = 1500;
const MAX_SHORT = 300;

const values = <T extends string>(list: readonly { value: T }[]) =>
  list.map((o) => o.value) as [T, ...T[]];

// Specific career paths, plus the bare track values older reviews may hold.
const CAREER_VALUES = [...values(CAREER_PATHS), ...values(TRACKS)] as [string, ...string[]];

export type EvalKey = (typeof EVALUATION_COMPONENTS)[number]["value"];
export const EVAL_KEYS = EVALUATION_COMPONENTS.map((c) => c.value) as EvalKey[];

/** What the form holds while someone is writing. Anything may still be empty. */
export type ReviewFields = {
  why_taken: string[];
  workload_band: string | null;
  eval_participation: number | null;
  eval_quizzes: number | null;
  eval_individual: number | null;
  eval_group: number | null;
  eval_midterm: number | null;
  eval_final: number | null;
  outline_gap: string;
  quant_qual: number | null;
  teaching_styles: string[];
  grade_risk: string | null;
  grade_risk_reason: string;
  learning_value: number | null;
  learning_value_reason: string;
  careers_helped: string[];
  who_should_take: string;
  who_should_skip: string;
  outline_match: string | null;
  visibility: "named" | "anonymous";
  open_to_questions: boolean;
};

export const EMPTY_REVIEW: ReviewFields = {
  why_taken: [],
  workload_band: null,
  eval_participation: null,
  eval_quizzes: null,
  eval_individual: null,
  eval_group: null,
  eval_midterm: null,
  eval_final: null,
  outline_gap: "",
  quant_qual: null,
  teaching_styles: [],
  grade_risk: null,
  grade_risk_reason: "",
  learning_value: null,
  learning_value_reason: "",
  careers_helped: [],
  who_should_take: "",
  who_should_skip: "",
  outline_match: null,
  visibility: "named",
  open_to_questions: true,
};

/** Fields plus `eval_total`, the pseudo-field the mix error is reported on. */
export type ReviewErrorKey = keyof ReviewFields | "eval_total";
export type ReviewErrors = Partial<Record<ReviewErrorKey, string>>;

export function evalTotal(fields: Pick<ReviewFields, EvalKey>): number {
  return EVAL_KEYS.reduce((sum, key) => sum + (fields[key] ?? 0), 0);
}

const percent = z.number().int().min(0).max(100);
const scale = (message: string) => z.number({ error: message }).int().min(1).max(5);

const publishSchema = z.object({
  why_taken: z.array(z.enum(values(WHY_TAKEN))).min(1, "Pick at least one reason"),
  workload_band: z.enum(WORKLOAD_BANDS, { error: "Choose the weekly workload" }),
  eval_participation: percent,
  eval_quizzes: percent,
  eval_individual: percent,
  eval_group: percent,
  eval_midterm: percent,
  eval_final: percent,
  outline_gap: z
    .string()
    .trim()
    .min(MIN_REASON_CHARS, `Write at least ${MIN_REASON_CHARS} characters`)
    .max(MAX_TEXT, `Keep this under ${MAX_TEXT} characters`),
  quant_qual: scale("Choose where the course sits between qual and quant"),
  teaching_styles: z
    .array(z.enum(values(TEACHING_STYLES)))
    .min(1, "Pick at least one teaching style"),
  grade_risk: z.enum(["low", "medium", "high"], { error: "Choose the grade risk" }),
  grade_risk_reason: z
    .string()
    .trim()
    .min(1, "Say why, in a few words")
    .max(MAX_SHORT, `Keep this under ${MAX_SHORT} characters`),
  learning_value: scale("Rate the learning value"),
  learning_value_reason: z
    .string()
    .trim()
    .min(MIN_REASON_CHARS, `Write at least ${MIN_REASON_CHARS} characters`)
    .max(MAX_TEXT, `Keep this under ${MAX_TEXT} characters`),
  careers_helped: z.array(z.enum(CAREER_VALUES)),
  who_should_take: z.string().trim().max(MAX_SHORT, `Keep this under ${MAX_SHORT} characters`),
  who_should_skip: z.string().trim().max(MAX_SHORT, `Keep this under ${MAX_SHORT} characters`),
  outline_match: z.enum(["yes", "partly", "no"], { error: "Choose one" }),
  visibility: z.enum(["named", "anonymous"]),
  open_to_questions: z.boolean(),
});

export type PublishableReview = z.infer<typeof publishSchema>;

/** Blank percentages count as zero once the person has started on the mix. */
function normalise(fields: ReviewFields): Record<string, unknown> {
  const out: Record<string, unknown> = { ...fields };
  for (const key of EVAL_KEYS) out[key] = fields[key] ?? 0;
  return out;
}

export function validateReview(
  fields: ReviewFields,
): { ok: true; data: PublishableReview } | { ok: false; errors: ReviewErrors } {
  const parsed = publishSchema.safeParse(normalise(fields));
  const errors: ReviewErrors = {};

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as ReviewErrorKey;
      if ((EVAL_KEYS as string[]).includes(key)) {
        // A bad single percentage is reported with the mix as a whole.
        errors.eval_total ??= "Each part must be a whole number from 0 to 100";
      } else {
        errors[key] ??= issue.message;
      }
    }
  }

  // Rules that span fields are checked here rather than in the schema, so they
  // are reported even while other answers are still missing. The form checks
  // one step at a time and needs every error for that step.
  const total = evalTotal(fields);
  if (total !== 100) {
    errors.eval_total ??= `The mix adds up to ${total}. It needs to total 100.`;
  }
  if (fields.who_should_take.trim() === "" && fields.who_should_skip.trim() === "") {
    errors.who_should_take ??= "Fill in at least one of these two";
  }

  if (parsed.success && Object.keys(errors).length === 0) return { ok: true, data: parsed.data };
  return { ok: false, errors };
}

// The form's four steps (docs/BUILD_PLAN.md 4.5). Offering choice is part of
// step 1 but is handled outside this schema, since it is not a review field.
export const STEPS = [
  { title: "The course", fields: ["why_taken", "workload_band"] },
  { title: "Grading", fields: ["eval_total", "grade_risk", "grade_risk_reason", "outline_match"] },
  {
    title: "What it was like",
    fields: [
      "quant_qual",
      "teaching_styles",
      "outline_gap",
      "learning_value",
      "learning_value_reason",
    ],
  },
  {
    title: "Who it is for",
    fields: [
      "careers_helped",
      "who_should_take",
      "who_should_skip",
      "visibility",
      "open_to_questions",
    ],
  },
] as const satisfies readonly { title: string; fields: readonly ReviewErrorKey[] }[];

export function errorsForStep(errors: ReviewErrors, step: number): ReviewErrors {
  const out: ReviewErrors = {};
  for (const key of STEPS[step].fields as readonly ReviewErrorKey[]) {
    if (errors[key]) out[key] = errors[key];
  }
  return out;
}

/** First step that still has something wrong: where a returning writer resumes. */
export function firstIncompleteStep(fields: ReviewFields): number {
  const result = validateReview(fields);
  if (result.ok) return STEPS.length - 1;
  for (let step = 0; step < STEPS.length; step += 1) {
    if (Object.keys(errorsForStep(result.errors, step)).length > 0) return step;
  }
  return 0;
}

// Draft saves accept anything of the right shape, complete or not. This is a
// type and size check on untrusted input, not a completeness check.
const draftText = z.string().max(MAX_TEXT + 500);
const draftSchema = z.object({
  why_taken: z.array(z.enum(values(WHY_TAKEN))).max(WHY_TAKEN.length),
  workload_band: z.enum(WORKLOAD_BANDS).nullable(),
  eval_participation: percent.nullable(),
  eval_quizzes: percent.nullable(),
  eval_individual: percent.nullable(),
  eval_group: percent.nullable(),
  eval_midterm: percent.nullable(),
  eval_final: percent.nullable(),
  outline_gap: draftText,
  quant_qual: z.number().int().min(1).max(5).nullable(),
  teaching_styles: z.array(z.enum(values(TEACHING_STYLES))).max(TEACHING_STYLES.length),
  grade_risk: z.enum(["low", "medium", "high"]).nullable(),
  grade_risk_reason: draftText,
  learning_value: z.number().int().min(1).max(5).nullable(),
  learning_value_reason: draftText,
  careers_helped: z.array(z.enum(CAREER_VALUES)).max(CAREER_VALUES.length),
  who_should_take: draftText,
  who_should_skip: draftText,
  outline_match: z.enum(["yes", "partly", "no"]).nullable(),
  visibility: z.enum(["named", "anonymous"]),
  open_to_questions: z.boolean(),
});

export function parseDraft(input: unknown): ReviewFields | null {
  const parsed = draftSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

const blankToNull = (text: string) => (text.trim() === "" ? null : text.trim());

/** Column values for a draft row: empty answers are stored as null. */
export function toDraftRow(fields: ReviewFields) {
  return {
    why_taken: fields.why_taken.length > 0 ? fields.why_taken : null,
    workload_band: fields.workload_band,
    eval_participation: fields.eval_participation,
    eval_quizzes: fields.eval_quizzes,
    eval_individual: fields.eval_individual,
    eval_group: fields.eval_group,
    eval_midterm: fields.eval_midterm,
    eval_final: fields.eval_final,
    outline_gap: blankToNull(fields.outline_gap),
    quant_qual: fields.quant_qual,
    teaching_styles: fields.teaching_styles.length > 0 ? fields.teaching_styles : null,
    grade_risk: fields.grade_risk,
    grade_risk_reason: blankToNull(fields.grade_risk_reason),
    learning_value: fields.learning_value,
    learning_value_reason: blankToNull(fields.learning_value_reason),
    careers_helped: fields.careers_helped.length > 0 ? fields.careers_helped : null,
    who_should_take: blankToNull(fields.who_should_take),
    who_should_skip: blankToNull(fields.who_should_skip),
    outline_match: fields.outline_match,
    visibility: fields.visibility,
    open_to_questions: fields.open_to_questions,
  };
}

/** Column values for a published row. */
export function toPublishedRow(review: PublishableReview) {
  return {
    ...review,
    careers_helped: review.careers_helped.length > 0 ? review.careers_helped : null,
    who_should_take: blankToNull(review.who_should_take),
    who_should_skip: blankToNull(review.who_should_skip),
  };
}

export type ReviewRow = { [K in keyof ReturnType<typeof toDraftRow>]: unknown };

/** Rebuild form state from a stored row. */
export function fromRow(row: Record<string, unknown>): ReviewFields {
  const text = (v: unknown) => (typeof v === "string" ? v : "");
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
  const num = (v: unknown) => (typeof v === "number" ? v : null);
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  return {
    why_taken: list(row.why_taken),
    workload_band: str(row.workload_band),
    eval_participation: num(row.eval_participation),
    eval_quizzes: num(row.eval_quizzes),
    eval_individual: num(row.eval_individual),
    eval_group: num(row.eval_group),
    eval_midterm: num(row.eval_midterm),
    eval_final: num(row.eval_final),
    outline_gap: text(row.outline_gap),
    quant_qual: num(row.quant_qual),
    teaching_styles: list(row.teaching_styles),
    grade_risk: str(row.grade_risk),
    grade_risk_reason: text(row.grade_risk_reason),
    learning_value: num(row.learning_value),
    learning_value_reason: text(row.learning_value_reason),
    careers_helped: list(row.careers_helped),
    who_should_take: text(row.who_should_take),
    who_should_skip: text(row.who_should_skip),
    outline_match: str(row.outline_match),
    visibility: row.visibility === "anonymous" ? "anonymous" : "named",
    open_to_questions: row.open_to_questions !== false,
  };
}

export const REVIEW_COLUMNS =
  "why_taken, workload_band, eval_participation, eval_quizzes, eval_individual, eval_group, " +
  "eval_midterm, eval_final, outline_gap, quant_qual, teaching_styles, grade_risk, " +
  "grade_risk_reason, learning_value, learning_value_reason, careers_helped, who_should_take, " +
  "who_should_skip, outline_match, visibility, open_to_questions";

// A proposed offering ("my professor or term is not listed").
export const TERM_LABELS = [
  "Term 1",
  "Term 2",
  "Term 3",
  "Term 4",
  "Term 5",
  "Term 6",
  "Term 7",
  "Term 8",
] as const;

export const newOfferingSchema = z.object({
  professor: z
    .string()
    .trim()
    .min(3, "Enter the professor’s name")
    .max(80, "Keep the name under 80 characters"),
  term_label: z.enum(TERM_LABELS, { error: "Choose the term" }),
  cohort_year: z.string().trim().min(2, "Choose the cohort").max(20),
});
export type NewOffering = z.infer<typeof newOfferingSchema>;
