"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  saveCareerEntry,
  type CareerSaveInput,
  type CareerSaveResult,
} from "@/app/(app)/write/career-actions";
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
import type { PublicCareerEntry } from "@/lib/domain/careers";
import {
  companyNoteSchema,
  MAX_MATTERED,
  MIN_STAGE_CHARS,
  MIN_STAGES,
  MIN_WHY_CHARS,
  playbookSchema,
  RECOMMEND,
  RELATIONSHIPS,
  STAGE_KEYS,
  type StageKey,
} from "@/lib/schemas/careerEntry";
import { CareerEntryView } from "./career-entry-view";
import { ChoiceChips, MultiChips, Question, TextArea, Toggle } from "./form-fields";
import {
  card,
  errorBox,
  fieldInput,
  fieldLabel,
  notice,
  primaryButton,
  secondaryButton,
  warnCallout,
} from "./styles";

// Track playbook and company note forms (requirements 5.2, 5.3). One page of
// questions, then a preview of exactly what readers will see, then publish.

const NO_PAY = "No salary, stipend or offer amounts, please. ISB Hood does not collect them.";

type Author = { name: string; cohort: string };
type Shared = { visibility: "named" | "anonymous"; open_to_questions: boolean };

export type PlaybookFields = Shared & {
  from_function: string | null;
  from_industry: string | null;
  from_years: string | null;
  track: string | null;
  role: string;
  company_type: string | null;
  company: string;
  path: Record<StageKey, string>;
  applied: string | null;
  shortlists: string | null;
  interviews: string | null;
  offers: string | null;
  mattered: string[];
  mattered_why: string;
  course_ids: string[];
  latest_safe_start: string;
  mistakes_to_avoid: string;
};

export type CompanyNoteFields = Shared & {
  company: string;
  role: string;
  year: string;
  track: string | null;
  relationship: string | null;
  process_rounds: string;
  what_was_asked: string;
  prep_that_worked: string;
  culture_and_team: string;
  recommend: string | null;
  recommend_to_whom: string;
};

const len = (s: string) => s.trim().length;

// ------------------------------------------------------------- validation
type Errors = Record<string, string>;

function playbookErrors(f: PlaybookFields): Errors {
  const e: Errors = {};
  if (!f.from_function || !f.from_industry || !f.from_years)
    e.from = "Choose your function, industry and years before ISB.";
  if (!f.track) e.track = "Choose the track you moved into.";
  if (len(f.role) < 2) e.role = "Add the role, for example “Product Manager”.";
  if (!f.company_type) e.company_type = "Choose the kind of company.";
  const stages = STAGE_KEYS.filter((k) => len(f.path[k]) >= MIN_STAGE_CHARS).length;
  if (stages < MIN_STAGES)
    e.path = `Describe at least ${MIN_STAGES} stages, a sentence or two each (${MIN_STAGE_CHARS}+ characters).`;
  if (!f.applied || !f.shortlists || !f.interviews || !f.offers)
    e.numbers = "Pick a range for each number. Rough is fine.";
  if (f.mattered.length === 0) e.mattered = "Pick what mattered most (up to 3).";
  if (len(f.mattered_why) < MIN_WHY_CHARS) e.mattered_why = `Say why in a sentence or two.`;
  if (len(f.latest_safe_start) < MIN_STAGE_CHARS)
    e.latest_safe_start = "A sentence on the latest safe start helps readers most.";
  if (len(f.mistakes_to_avoid) < MIN_STAGE_CHARS)
    e.mistakes_to_avoid = "Add at least one mistake to avoid.";
  return e;
}

function noteErrors(f: CompanyNoteFields): Errors {
  const e: Errors = {};
  if (len(f.company) < 2) e.company = "Add the company.";
  if (len(f.role) < 2) e.role = "Add the role.";
  if (!/^20\d\d$/.test(f.year.trim())) e.year = "Year as four digits, for example 2026.";
  if (!f.track) e.track = "Choose the track.";
  if (!f.relationship) e.relationship = "Choose how you know the company.";
  for (const [k, label] of [
    ["process_rounds", "the process and rounds"],
    ["what_was_asked", "what was asked"],
    ["prep_that_worked", "the prep that worked"],
  ] as const)
    if (len(f[k]) < MIN_STAGE_CHARS) e[k] = `Describe ${label} in a sentence or two.`;
  if (!f.recommend) e.recommend = "Would you recommend it?";
  if (len(f.recommend_to_whom) < MIN_STAGE_CHARS) e.recommend_to_whom = "Say who it suits.";
  return e;
}

function playbookBody(f: PlaybookFields) {
  return {
    from: { function: f.from_function, industry: f.from_industry, years_band: f.from_years },
    to: { track: f.track, role: f.role, company_type: f.company_type, company: f.company },
    path: f.path,
    numbers: {
      applied: f.applied,
      shortlists: f.shortlists,
      interviews: f.interviews,
      offers: f.offers,
    },
    what_mattered: { picks: f.mattered, why: f.mattered_why },
    latest_safe_start: f.latest_safe_start,
    mistakes_to_avoid: f.mistakes_to_avoid,
  };
}

function noteBody(f: CompanyNoteFields) {
  return {
    company: f.company,
    role: f.role,
    year: f.year.trim(),
    track: f.track,
    relationship: f.relationship,
    process_rounds: f.process_rounds,
    what_was_asked: f.what_was_asked,
    prep_that_worked: f.prep_that_worked,
    culture_and_team: f.culture_and_team,
    recommend: f.recommend,
    recommend_to_whom: f.recommend_to_whom,
  };
}

// --------------------------------------------------------------- the shell
function useActiveSeconds() {
  const seconds = useRef(0);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") seconds.current += 1;
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  return seconds;
}

function FormShell<F extends Shared>({
  kind,
  author,
  entryId,
  fields,
  setFields,
  errorsOf,
  toBody,
  courseIds,
  courseLabels,
  wasPublished,
  heading,
  children,
}: {
  heading: { title: string; lead: string };
  kind: "playbook" | "company_note";
  author: Author;
  entryId: string | null;
  fields: F;
  setFields: (f: F) => void;
  errorsOf: (f: F) => Errors;
  toBody: (f: F) => unknown;
  courseIds: string[];
  courseLabels: { id: string; code: string; title: string }[];
  wasPublished: boolean;
  children: (errors: Errors) => React.ReactNode;
}) {
  const [view, setView] = useState<"form" | "preview">("form");
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [confirmPay, setConfirmPay] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Extract<CareerSaveResult, { ok: true }> | null>(null);
  const seconds = useActiveSeconds();
  const top = useRef<HTMLDivElement>(null);
  const noun = kind === "playbook" ? "playbook" : "company note";

  useEffect(() => {
    top.current?.scrollIntoView({ block: "start" });
  }, [view, done]);

  const preview = () => {
    const found = errorsOf(fields);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setBanner("Some answers are missing. They are marked below.");
      requestAnimationFrame(() =>
        document.getElementById(Object.keys(found)[0])?.scrollIntoView({ block: "center" }),
      );
      return;
    }
    // The server checks again with the same schema; this only catches a mismatch early.
    try {
      previewEntry(kind, toBody(fields), fields.visibility, author);
    } catch {
      setBanner("Some answers are not complete yet. Check each question and try again.");
      return;
    }
    setBanner(null);
    setView("preview");
  };

  const publish = async (payConfirmed: boolean) => {
    setBusy(true);
    const input: CareerSaveInput = {
      type: kind,
      entryId,
      body: toBody(fields),
      visibility: fields.visibility,
      openToQuestions: fields.open_to_questions,
      courseIds,
      formSeconds: seconds.current,
      confirmPay: payConfirmed,
    };
    const result = await saveCareerEntry(input).catch((): CareerSaveResult => ({
      ok: false,
      error: "We could not save that. Try again.",
    }));
    setBusy(false);
    if (result.ok) setDone(result);
    else {
      setBanner(result.error);
      setConfirmPay(result.confirmPay === true);
    }
  };

  if (done) {
    return (
      <div ref={top} className="scroll-mt-4">
        <h1 className="type-title">{wasPublished ? "Changes saved" : "Thank you"}</h1>
        <p className="mt-3 text-foreground/80">
          {done.status === "live"
            ? `Your ${noun} is live. Readers with your background will find it under “Like me”, and we email you when someone asks a question.`
            : `Your ${noun} is saved. It goes live as soon as we verify you, usually within a day.`}
        </p>
        <div className="mt-6 space-y-3">
          {done.status === "live" ? (
            <Link href={`/careers/${done.entryId}`} className={primaryButton}>
              See it as readers do
            </Link>
          ) : null}
          <Link
            href={kind === "playbook" ? "/write/company-note" : "/write/playbook"}
            className={`${secondaryButton} w-full`}
          >
            {kind === "playbook" ? "Add a company note too" : "Write your playbook too"}
          </Link>
          <Link href="/me" className={`${secondaryButton} w-full`}>
            My activity
          </Link>
        </div>
      </div>
    );
  }

  const set = <K extends keyof F>(key: K, value: F[K]) => setFields({ ...fields, [key]: value });

  return (
    <div ref={top} className="scroll-mt-4">
      <h1 className="type-title">{view === "preview" ? "Check and publish" : heading.title}</h1>
      <p className="mt-2 mb-6 text-foreground/80">
        {view === "preview" ? "Exactly what readers will see." : heading.lead}
      </p>
      {banner ? (
        <div role="alert" className={`${confirmPay ? warnCallout : errorBox} mb-4`}>
          <p>{banner}</p>
          {confirmPay ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => publish(true)}
              className={`${secondaryButton} mt-2`}
            >
              Publish anyway
            </button>
          ) : null}
        </div>
      ) : null}

      {view === "preview" ? (
        <>
          <p className={notice}>You can edit or delete it later from My activity.</p>
          <div className={`${card} mt-4`}>
            <CareerEntryView
              entry={previewEntry(kind, toBody(fields), fields.visibility, author)}
              courses={courseLabels}
              reader={null}
              preview
            />
          </div>
          <div className="mt-6 space-y-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => publish(false)}
              className={primaryButton}
            >
              {busy ? "Publishing…" : wasPublished ? "Save changes" : "Publish"}
            </button>
            <button
              type="button"
              onClick={() => setView("form")}
              className={`${secondaryButton} w-full`}
            >
              Back to edit
            </button>
          </div>
        </>
      ) : (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            preview();
          }}
          className="space-y-8"
        >
          <p className={notice}>{NO_PAY}</p>
          {children(errors)}

          <Question
            id="visibility"
            legend="How should you appear?"
            hint="Moderators can always see who wrote an entry."
          >
            <div className="space-y-2">
              {(
                [
                  ["named", "Show my name", `${author.name}, ${author.cohort}`],
                  ["anonymous", "Keep my name hidden", `Verified ${author.cohort} student`],
                ] as const
              ).map(([value, label, shows]) => (
                <label
                  key={value}
                  className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-input p-3"
                >
                  <input
                    type="radio"
                    name="visibility"
                    checked={fields.visibility === value}
                    onChange={() => set("visibility", value as F["visibility"])}
                    className="mt-0.5 size-5 shrink-0 accent-foreground"
                  />
                  <span>
                    <span className="block text-base font-medium text-foreground">{label}</span>
                    <span className="block text-sm text-muted-foreground">
                      Appears as “{shows}”
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </Question>

          <Toggle
            id="open_to_questions"
            label="Open to questions"
            description="Readers can ask you a follow-up under your entry. We email you; replies are public."
            checked={fields.open_to_questions}
            onChange={(v) => set("open_to_questions", v as F["open_to_questions"])}
          />

          <button type="submit" className={primaryButton}>
            Preview
          </button>
        </form>
      )}
    </div>
  );
}

/** A stand-in public entry, so the preview uses the same component as the entry page. */
function previewEntry(
  kind: "playbook" | "company_note",
  body: unknown,
  visibility: "named" | "anonymous",
  author: Author,
): PublicCareerEntry {
  const base = {
    id: "preview",
    published_at: null,
    is_edited: false,
    open_to_questions: true,
    author_display:
      visibility === "named"
        ? `${author.name}, ${author.cohort}`
        : `Verified ${author.cohort} student`,
    author_cohort: author.cohort,
    match_function: null,
    match_industry: null,
    entered_by_team: false,
    is_mine: true,
  };
  if (kind === "playbook") {
    const b = playbookSchema.parse(body);
    return {
      ...base,
      type: "playbook",
      body: b,
      track: b.to.track,
      company: b.to.company || null,
      from_function: b.from.function,
      from_industry: b.from.industry,
      from_years_band: b.from.years_band,
    };
  }
  const b = companyNoteSchema.parse(body);
  return {
    ...base,
    type: "company_note",
    body: b,
    track: b.track,
    company: b.company,
    from_function: null,
    from_industry: null,
    from_years_band: null,
  };
}

// --------------------------------------------------------------- playbook
const select = (
  id: string,
  label: string,
  value: string | null,
  options: readonly { value: string; label: string }[],
  onChange: (v: string) => void,
  invalid: boolean,
) => (
  <div>
    <label htmlFor={id} className={fieldLabel}>
      {label}
    </label>
    <select
      id={id}
      value={value ?? ""}
      aria-invalid={invalid ? true : undefined}
      onChange={(e) => onChange(e.target.value)}
      className={`${fieldInput} mt-1.5`}
    >
      <option value="" disabled>
        Choose
      </option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

const BAND_OPTIONS = NUMBER_BANDS.map((b) => ({ value: b, label: b }));

const STAGE_HINTS: Record<StageKey, string> = {
  before_isb: "What from your work before ISB carried over, or held you back?",
  early_terms: "Clubs, CV, GPA, the first decisions.",
  mid_terms: "Internship, competitions, live projects, prep.",
  late_terms: "Courses, mocks, the final push.",
  placement_weeks: "Shortlists, rounds, what decided it.",
};

export function PlaybookForm({
  heading,
  author,
  entryId,
  initial,
  courses,
  wasPublished,
}: {
  heading: { title: string; lead: string };
  author: Author;
  entryId: string | null;
  initial: PlaybookFields;
  courses: { id: string; code: string; title: string }[];
  wasPublished: boolean;
}) {
  const [f, setF] = useState(initial);
  const set = <K extends keyof PlaybookFields>(k: K, v: PlaybookFields[K]) =>
    setF({ ...f, [k]: v });

  return (
    <FormShell
      heading={heading}
      kind="playbook"
      author={author}
      entryId={entryId}
      fields={f}
      setFields={setF}
      errorsOf={playbookErrors}
      toBody={playbookBody}
      courseIds={f.course_ids}
      courseLabels={courses.filter((c) => f.course_ids.includes(c.id))}
      wasPublished={wasPublished}
    >
      {(e) => (
        <>
          <Question id="from" legend="Before ISB" error={e.from}>
            <div className="grid grid-cols-2 gap-3">
              {select(
                "from_function",
                "Function",
                f.from_function,
                FUNCTIONS,
                (v) => set("from_function", v),
                !!e.from && !f.from_function,
              )}
              {select(
                "from_industry",
                "Industry",
                f.from_industry,
                INDUSTRIES,
                (v) => set("from_industry", v),
                !!e.from && !f.from_industry,
              )}
            </div>
            <p className={`${fieldLabel} mt-3`}>Years of experience</p>
            <div className="mt-1.5">
              <ChoiceChips
                name="from_years"
                options={YEARS_EXPERIENCE_BANDS.map((b) => ({ value: b, label: `${b} years` }))}
                value={f.from_years}
                onChange={(v) => set("from_years", v)}
              />
            </div>
          </Question>

          <Question id="track" legend="Which track did you move into?" error={e.track}>
            <ChoiceChips
              name="track"
              options={TRACKS}
              value={f.track}
              onChange={(v) => set("track", v)}
            />
          </Question>

          <div className="grid grid-cols-2 gap-3">
            <div id="role">
              <label htmlFor="role-input" className={fieldLabel}>
                Role
              </label>
              <input
                id="role-input"
                value={f.role}
                maxLength={120}
                placeholder="Product Manager"
                aria-invalid={e.role ? true : undefined}
                onChange={(ev) => set("role", ev.target.value)}
                className={`${fieldInput} mt-1.5`}
              />
              {e.role ? <p className="mt-1 text-sm text-destructive">{e.role}</p> : null}
            </div>
            <div id="company_type">
              {select(
                "company_type-input",
                "Kind of company",
                f.company_type,
                COMPANY_TYPES,
                (v) => set("company_type", v),
                !!e.company_type,
              )}
              {e.company_type ? (
                <p className="mt-1 text-sm text-destructive">{e.company_type}</p>
              ) : null}
            </div>
          </div>
          <div>
            <label htmlFor="company" className={fieldLabel}>
              Company <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              id="company"
              value={f.company}
              maxLength={120}
              onChange={(ev) => set("company", ev.target.value)}
              className={`${fieldInput} mt-1.5`}
            />
          </div>

          <Question
            id="path"
            legend="Your path, stage by stage"
            hint={`At least ${MIN_STAGES} stages. Terms are grouped 1 to 3, 4 to 5 and 6 to 8.`}
            error={e.path}
          >
            <div className="space-y-4">
              {TERM_BUCKETS.map((b) => (
                <div key={b.value}>
                  <label htmlFor={`path-${b.value}`} className={fieldLabel}>
                    {b.label}
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {STAGE_HINTS[b.value as StageKey]}
                  </p>
                  <div className="mt-1.5">
                    <TextArea
                      id={`path-${b.value}`}
                      rows={3}
                      value={f.path[b.value as StageKey]}
                      onChange={(v) => set("path", { ...f.path, [b.value]: v })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Question>

          <Question
            id="numbers"
            legend="Numbers"
            hint="Ranges are fine. Never pay or offer amounts."
            error={e.numbers}
          >
            <div className="space-y-3">
              {(
                [
                  ["applied", "Firms applied to"],
                  ["shortlists", "Shortlists"],
                  ["interviews", "Interviews"],
                  ["offers", "Offers"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <p className={fieldLabel}>{label}</p>
                  <div className="mt-1.5">
                    <ChoiceChips
                      name={key}
                      options={BAND_OPTIONS}
                      value={f[key]}
                      onChange={(v) => set(key, v)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Question>

          <Question
            id="mattered"
            legend="What mattered most?"
            hint={`Pick up to ${MAX_MATTERED}.`}
            error={e.mattered}
          >
            <MultiChips
              name="mattered"
              options={WHAT_MATTERED}
              value={f.mattered}
              max={MAX_MATTERED}
              onChange={(v) => set("mattered", v)}
            />
          </Question>
          <Question id="mattered_why" legend="Why those?" error={e.mattered_why}>
            <TextArea
              id="mattered_why-input"
              value={f.mattered_why}
              minChars={MIN_WHY_CHARS}
              invalid={!!e.mattered_why}
              onChange={(v) => set("mattered_why", v)}
            />
          </Question>

          {courses.length > 0 ? (
            <Question
              id="courses"
              legend="Courses that helped"
              hint="Optional. Readers can open each course page from your playbook."
            >
              <MultiChips
                name="courses"
                options={courses.map((c) => ({ value: c.id, label: c.title }))}
                value={f.course_ids}
                max={6}
                onChange={(v) => set("course_ids", v)}
              />
            </Question>
          ) : null}

          <Question
            id="latest_safe_start"
            legend="Latest safe start"
            hint="Answers “am I too late?” for someone reading this in Term 3 or Term 5."
            error={e.latest_safe_start}
          >
            <TextArea
              id="latest_safe_start-input"
              rows={3}
              value={f.latest_safe_start}
              invalid={!!e.latest_safe_start}
              onChange={(v) => set("latest_safe_start", v)}
            />
          </Question>
          <Question id="mistakes_to_avoid" legend="Mistakes to avoid" error={e.mistakes_to_avoid}>
            <TextArea
              id="mistakes_to_avoid-input"
              rows={3}
              value={f.mistakes_to_avoid}
              invalid={!!e.mistakes_to_avoid}
              onChange={(v) => set("mistakes_to_avoid", v)}
            />
          </Question>
        </>
      )}
    </FormShell>
  );
}

// ------------------------------------------------------------ company note
export function CompanyNoteForm({
  heading,
  author,
  entryId,
  initial,
  wasPublished,
}: {
  heading: { title: string; lead: string };
  author: Author;
  entryId: string | null;
  initial: CompanyNoteFields;
  wasPublished: boolean;
}) {
  const [f, setF] = useState(initial);
  const set = <K extends keyof CompanyNoteFields>(k: K, v: CompanyNoteFields[K]) =>
    setF({ ...f, [k]: v });
  const text = (
    key: "process_rounds" | "what_was_asked" | "prep_that_worked" | "culture_and_team",
    legend: string,
    hint: string,
    e: Errors,
  ) => (
    <Question id={key} legend={legend} hint={hint} error={e[key]}>
      <TextArea
        id={`${key}-input`}
        value={f[key]}
        invalid={!!e[key]}
        onChange={(v) => set(key, v)}
      />
    </Question>
  );

  return (
    <FormShell
      heading={heading}
      kind="company_note"
      author={author}
      entryId={entryId}
      fields={f}
      setFields={setF}
      errorsOf={noteErrors}
      toBody={noteBody}
      courseIds={[]}
      courseLabels={[]}
      wasPublished={wasPublished}
    >
      {(e) => (
        <>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["company", "Company", "Amazon"],
                ["role", "Role", "Product Manager"],
              ] as const
            ).map(([key, label, ph]) => (
              <div key={key} id={key} className={key === "company" ? "col-span-2" : ""}>
                <label htmlFor={`${key}-input`} className={fieldLabel}>
                  {label}
                </label>
                <input
                  id={`${key}-input`}
                  value={f[key]}
                  maxLength={120}
                  placeholder={ph}
                  aria-invalid={e[key] ? true : undefined}
                  onChange={(ev) => set(key, ev.target.value)}
                  className={`${fieldInput} mt-1.5`}
                />
                {e[key] ? <p className="mt-1 text-sm text-destructive">{e[key]}</p> : null}
              </div>
            ))}
            <div id="year">
              <label htmlFor="year-input" className={fieldLabel}>
                Year
              </label>
              <input
                id="year-input"
                value={f.year}
                inputMode="numeric"
                maxLength={4}
                placeholder="2026"
                aria-invalid={e.year ? true : undefined}
                onChange={(ev) => set("year", ev.target.value.replace(/\D/g, ""))}
                className={`${fieldInput} mt-1.5`}
              />
              {e.year ? <p className="mt-1 text-sm text-destructive">{e.year}</p> : null}
            </div>
          </div>

          <Question id="track" legend="Track" error={e.track}>
            <ChoiceChips
              name="track"
              options={TRACKS}
              value={f.track}
              onChange={(v) => set("track", v)}
            />
          </Question>

          <Question id="relationship" legend="How do you know it?" error={e.relationship}>
            <ChoiceChips
              name="relationship"
              options={RELATIONSHIPS}
              value={f.relationship}
              onChange={(v) => set("relationship", v)}
            />
          </Question>

          {text("process_rounds", "Process and rounds", "How many rounds, in what order.", e)}
          {text("what_was_asked", "What was asked", "Cases, questions, tests.", e)}
          {text("prep_that_worked", "Prep that worked", "What you would do again.", e)}
          {f.relationship && f.relationship !== "interviewed"
            ? text(
                "culture_and_team",
                "Work culture and team",
                "Optional. Only from people who interned or joined.",
                e,
              )
            : null}

          <Question id="recommend" legend="Would you recommend it?" error={e.recommend}>
            <ChoiceChips
              name="recommend"
              options={RECOMMEND}
              value={f.recommend}
              onChange={(v) => set("recommend", v)}
            />
          </Question>
          <Question
            id="recommend_to_whom"
            legend="To whom?"
            hint="Who would thrive there, and who should look elsewhere."
            error={e.recommend_to_whom}
          >
            <TextArea
              id="recommend_to_whom-input"
              rows={3}
              value={f.recommend_to_whom}
              invalid={!!e.recommend_to_whom}
              onChange={(v) => set("recommend_to_whom", v)}
            />
          </Question>
        </>
      )}
    </FormShell>
  );
}
