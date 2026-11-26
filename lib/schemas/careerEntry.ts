import { z } from "zod";
import {
  COMPANY_TYPES,
  FUNCTIONS,
  INDUSTRIES,
  NUMBER_BANDS,
  TERM_BUCKETS,
  TRACKS,
  WHAT_MATTERED,
  YEARS_EXPERIENCE_BANDS,
} from "@/lib/constants/vocab";

// Track playbook and company note (requirements 5.2 and 5.3; docs/BUILD_PLAN.md 5.2).
// One definition for the form, the server action and the entry page. The
// filterable fields (track, company, from_*) are copied into their own columns
// on save; everything else lives in `body`.

const MAX_TEXT = 1200;
const MAX_SHORT = 120;
/** A stage line needs a little substance, but not a paragraph. */
export const MIN_STAGE_CHARS = 20;
export const MIN_WHY_CHARS = 30;
/** Playbooks need at least this many stages filled in. */
export const MIN_STAGES = 2;
export const MAX_MATTERED = 3;

const values = <T extends string>(list: readonly { value: T }[]) =>
  list.map((o) => o.value) as [T, ...T[]];

const text = (min: number, max = MAX_TEXT) => z.string().trim().min(min).max(max);
const optionalText = z.string().trim().max(MAX_TEXT).optional().default("");

export const STAGE_KEYS = TERM_BUCKETS.map((b) => b.value);
export type StageKey = (typeof STAGE_KEYS)[number];

export const RELATIONSHIPS = [
  { value: "interviewed", label: "I interviewed there" },
  { value: "interned", label: "I interned there" },
  { value: "joined", label: "I joined" },
] as const;

export const RECOMMEND = [
  { value: "yes", label: "Yes" },
  { value: "depends", label: "It depends" },
  { value: "no", label: "No" },
] as const;

const band = z.enum(NUMBER_BANDS);

export const playbookSchema = z
  .object({
    from: z.object({
      function: z.enum(values(FUNCTIONS)),
      industry: z.enum(values(INDUSTRIES)),
      years_band: z.enum(YEARS_EXPERIENCE_BANDS),
    }),
    to: z.object({
      track: z.enum(values(TRACKS)),
      role: text(2, MAX_SHORT),
      company_type: z.enum(values(COMPANY_TYPES)),
      company: z.string().trim().max(MAX_SHORT).optional().default(""),
    }),
    path: z.object({
      before_isb: optionalText,
      early_terms: optionalText,
      mid_terms: optionalText,
      late_terms: optionalText,
      placement_weeks: optionalText,
    }),
    numbers: z.object({ applied: band, shortlists: band, interviews: band, offers: band }),
    what_mattered: z.object({
      picks: z
        .array(z.enum(values(WHAT_MATTERED)))
        .min(1)
        .max(MAX_MATTERED),
      why: text(MIN_WHY_CHARS),
    }),
    latest_safe_start: text(MIN_STAGE_CHARS),
    mistakes_to_avoid: text(MIN_STAGE_CHARS),
  })
  .superRefine((value, ctx) => {
    const filled = STAGE_KEYS.filter(
      (k) => (value.path[k] ?? "").trim().length >= MIN_STAGE_CHARS,
    ).length;
    if (filled < MIN_STAGES) {
      ctx.addIssue({
        code: "custom",
        path: ["path"],
        message: `Describe at least ${MIN_STAGES} stages, a sentence or two each.`,
      });
    }
  });

export type PlaybookBody = z.infer<typeof playbookSchema>;

export const companyNoteSchema = z
  .object({
    company: text(2, MAX_SHORT),
    role: text(2, MAX_SHORT),
    year: z.string().regex(/^20\d\d$/, "Year as four digits, for example 2026"),
    track: z.enum(values(TRACKS)),
    relationship: z.enum(["interviewed", "interned", "joined"]),
    process_rounds: text(MIN_STAGE_CHARS),
    what_was_asked: text(MIN_STAGE_CHARS),
    prep_that_worked: text(MIN_STAGE_CHARS),
    culture_and_team: optionalText,
    recommend: z.enum(["yes", "depends", "no"]),
    recommend_to_whom: text(MIN_STAGE_CHARS),
  })
  .transform((v) =>
    // Culture is shown only from people who worked there (plan 5.2).
    v.relationship === "interviewed" ? { ...v, culture_and_team: "" } : v,
  );

export type CompanyNoteBody = z.infer<typeof companyNoteSchema>;

/** Readable messages for the first few problems, keyed by top-level field. */
export function issuesByField(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.slice(0, 2).join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
