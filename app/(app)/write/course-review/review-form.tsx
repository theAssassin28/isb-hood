"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChoiceChips, MultiChips, Question, TextArea, Toggle } from "@/components/form-fields";
import { ReviewBody } from "@/components/review-body";
import {
  dangerButton,
  card,
  fieldInput,
  fieldLabel,
  notice,
  primaryButton,
  secondaryButton,
} from "@/components/styles";
import {
  CAREER_PATHS,
  COHORTS,
  EVALUATION_COMPONENTS,
  TEACHING_STYLES,
  TRACKS,
  WHY_TAKEN,
  WORKLOAD_BANDS,
} from "@/lib/constants/vocab";
import { offeringLabel } from "@/lib/domain/offering";
import {
  errorsForStep,
  evalTotal,
  MIN_REASON_CHARS,
  STEPS,
  TERM_LABELS,
  validateReview,
  type EvalKey,
  type ReviewErrors,
  type ReviewFields,
} from "@/lib/schemas/courseReview";
import { deleteReview, publishReview, saveDraft, type SaveInput, type SaveResult } from "./actions";

export type FormOffering = {
  id: string;
  professor: string;
  term_label: string;
  cohort_year: string;
  status: "approved" | "pending";
};

type Props = {
  course: { id: string; code: string; title: string };
  offerings: FormOffering[];
  initial: {
    reviewId: string | null;
    offeringId: string | null;
    fields: ReviewFields;
    /** null for a brand-new review. */
    status: "draft" | "pending_verification" | "live" | null;
    formSeconds: number;
    startStep: number;
    onBehalf: { name: string; cohort: string } | null;
  };
  author: { name: string; cohort: string };
  isModerator: boolean;
};

type View = number | "preview" | "done";

const NEW = "new";
const WORKLOAD = WORKLOAD_BANDS.map((band) => ({ value: band, label: `${band} hours` }));
const QUANT_QUAL = [
  { value: "1", label: "Fully qual" },
  { value: "2", label: "Mostly qual" },
  { value: "3", label: "Balanced" },
  { value: "4", label: "Mostly quant" },
  { value: "5", label: "Fully quant" },
];
const ONE_TO_FIVE = [
  { value: "1", label: "1 · Low" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5 · High" },
];
const GRADE_RISK = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];
const OUTLINE_MATCH = [
  { value: "yes", label: "Yes" },
  { value: "partly", label: "Partly" },
  { value: "no", label: "No" },
];
const COHORT_OPTIONS = COHORTS.filter((c) => c.value !== "other");

export function ReviewForm({
  course,
  offerings: initialOfferings,
  initial,
  author,
  isModerator,
}: Props) {
  const router = useRouter();
  const isPublished = initial.status !== null && initial.status !== "draft";

  const [offerings, setOfferings] = useState(initialOfferings);
  // With one confirmed professor and term there is nothing to choose: pre-select it.
  const onlyOffering =
    initialOfferings.length === 1 && initialOfferings[0].status !== "pending"
      ? initialOfferings[0].id
      : "";
  const [offeringChoice, setOfferingChoice] = useState<string>(
    initial.offeringId ?? (initialOfferings.length === 0 ? NEW : onlyOffering),
  );
  const [newOffering, setNewOffering] = useState({
    professor: "",
    term_label: "",
    cohort_year: COHORT_OPTIONS.some((c) => c.value === author.cohort) ? author.cohort : "",
  });
  const [fields, setFields] = useState<ReviewFields>(initial.fields);
  const [onBehalf, setOnBehalf] = useState(initial.onBehalf ?? { name: "", cohort: "" });
  const [reviewId, setReviewId] = useState(initial.reviewId);
  const [view, setView] = useState<View>(initial.startStep);
  const [errors, setErrors] = useState<ReviewErrors>({});
  const [offeringErrors, setOfferingErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Extract<SaveResult, { ok: true }> | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Saves run one at a time, so a background save and "Continue" never both
  // create the same review. The ref holds the newest id for whichever runs next.
  const reviewIdRef = useRef(initial.reviewId);
  const inFlight = useRef<Promise<unknown>>(Promise.resolve());
  const lastSaved = useRef(JSON.stringify([initial.fields, initial.offeringId]));

  // Active time in the form, carried across sessions (form_seconds).
  const seconds = useRef(initial.formSeconds);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") seconds.current += 1;
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Each step starts at the top, with focus on its heading for screen readers.
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // On phones the page scrolls inside <body> (app/globals.css); on desktop, the window.
    document.body.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
    heading.current?.focus();
  }, [view]);

  const set = <K extends keyof ReviewFields>(key: K, value: ReviewFields[K]) => {
    setFields((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      if (key.startsWith("eval_")) delete next.eval_total;
      return next;
    });
  };

  const chosenOffering = offerings.find((o) => o.id === offeringChoice) ?? null;
  const currentOfferingLabel = chosenOffering
    ? offeringLabel(chosenOffering)
    : newOffering.professor.trim() !== ""
      ? offeringLabel({
          professor: newOffering.professor.trim(),
          term_label: newOffering.term_label || "term not chosen",
          cohort_year: newOffering.cohort_year || "cohort not chosen",
        })
      : "Professor and term not chosen";

  const authorDisplay =
    isModerator && onBehalf.name.trim() !== ""
      ? fields.visibility === "named"
        ? `${onBehalf.name.trim()}, ${onBehalf.cohort.trim() || "alum"}`
        : `Verified ${onBehalf.cohort.trim() || "ISB"} student`
      : fields.visibility === "named"
        ? `${author.name}, ${author.cohort}`
        : `Verified ${author.cohort} student`;

  const buildInput = (step: number): SaveInput => ({
    reviewId: reviewIdRef.current,
    courseId: course.id,
    offering: offeringChoice === NEW ? newOffering : { id: offeringChoice },
    fields,
    step,
    formSeconds: seconds.current,
    onBehalf: isModerator && onBehalf.name.trim() !== "" ? onBehalf : null,
  });

  // Save the draft in the background 2.5 seconds after the last change, so a
  // closed tab loses nothing. Only for unpublished reviews of a listed offering
  // (a new professor is saved with "Continue", once it is checked).
  const snapshot = JSON.stringify([fields, offeringChoice]);
  useEffect(() => {
    if (isPublished || typeof view !== "number") return;
    if (offeringChoice === "" || offeringChoice === NEW) return;
    if (snapshot === lastSaved.current) return;
    const input = { ...buildInput(view), autosave: true };
    const timer = setTimeout(() => {
      inFlight.current = inFlight.current.then(async () => {
        const saved = await saveDraft({ ...input, reviewId: reviewIdRef.current }).catch(
          () => null,
        );
        if (saved?.ok) {
          reviewIdRef.current = saved.reviewId;
          setReviewId(saved.reviewId);
          lastSaved.current = snapshot;
        }
      });
    }, 2500);
    return () => clearTimeout(timer);
    // buildInput is rebuilt every render; `snapshot` is what decides a save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, view, isPublished]);

  const checkOffering = (): boolean => {
    const problems: Record<string, string> = {};
    if (offeringChoice === "") {
      problems.offering = "Choose the professor and term you took";
    } else if (offeringChoice === NEW) {
      if (newOffering.professor.trim().length < 3)
        problems.professor = "Enter the professor’s name";
      if (newOffering.term_label === "") problems.term_label = "Choose the term";
      if (newOffering.cohort_year === "") problems.cohort_year = "Choose the cohort";
    }
    setOfferingErrors(problems);
    return Object.keys(problems).length === 0;
  };

  const focusFirstError = (keys: string[]) => {
    requestAnimationFrame(() => {
      for (const key of keys) {
        const el = document.getElementById(key);
        if (el) {
          el.scrollIntoView({ block: "center" });
          return;
        }
      }
    });
  };

  /** Apply what the server said after a save. Returns true if it worked. */
  const absorb = (saved: SaveResult): saved is Extract<SaveResult, { ok: true }> => {
    if (!saved.ok) {
      setBanner(saved.error);
      if (saved.offeringErrors) setOfferingErrors(saved.offeringErrors);
      if (saved.fieldErrors) setErrors(saved.fieldErrors);
      return false;
    }
    setBanner(null);
    reviewIdRef.current = saved.reviewId;
    setReviewId(saved.reviewId);
    if (offeringChoice === NEW) {
      setOfferings((list) =>
        list.some((o) => o.id === saved.offeringId)
          ? list
          : [
              ...list,
              {
                id: saved.offeringId,
                professor: newOffering.professor.trim(),
                term_label: newOffering.term_label,
                cohort_year: newOffering.cohort_year,
                status: saved.offeringPending ? "pending" : "approved",
              },
            ],
      );
      setOfferingChoice(saved.offeringId);
    }
    return true;
  };

  const next = async (step: number) => {
    const checked = validateReview(fields);
    const stepErrors = checked.ok ? {} : errorsForStep(checked.errors, step);
    const offeringOk = step === 0 ? checkOffering() : true;
    setErrors(stepErrors);
    if (!offeringOk || Object.keys(stepErrors).length > 0) {
      setBanner(null);
      focusFirstError(["offering", "professor", ...STEPS[step].fields]);
      return;
    }

    if (!isPublished) {
      setBusy(true);
      await inFlight.current;
      const saved = await saveDraft(buildInput(step)).catch((): SaveResult => ({
        ok: false,
        error: "We could not save that. Check your connection and try again.",
      }));
      setBusy(false);
      if (!absorb(saved)) return;
      lastSaved.current = snapshot;
    }
    setView(step === STEPS.length - 1 ? "preview" : step + 1);
  };

  const publish = async () => {
    setBusy(true);
    await inFlight.current;
    const saved = await publishReview(buildInput(STEPS.length - 1)).catch((): SaveResult => ({
      ok: false,
      error: "We could not publish that. Check your connection and try again.",
    }));
    setBusy(false);
    if (!absorb(saved)) {
      if (!saved.ok && saved.fieldErrors) {
        // Take the writer back to the first step that needs attention.
        for (let step = 0; step < STEPS.length; step += 1) {
          if (Object.keys(errorsForStep(saved.fieldErrors, step)).length > 0) {
            setView(step);
            break;
          }
        }
      }
      return;
    }
    setResult(saved);
    setView("done");
  };

  const remove = async () => {
    if (!reviewId) return;
    setBusy(true);
    await inFlight.current;
    const outcome = await deleteReview(reviewId).catch(() => ({
      ok: false as const,
      error: "We could not delete that. Try again.",
    }));
    setBusy(false);
    if (!outcome.ok) {
      setBanner(outcome.error);
      return;
    }
    router.push("/write");
  };

  // ------------------------------------------------------------------ done
  if (view === "done" && result) {
    return (
      <div>
        <h1 ref={heading} tabIndex={-1} className="type-title outline-none">
          {isPublished ? "Changes saved" : "Thank you"}
        </h1>
        <p className="mt-3 text-foreground/90">
          {result.status === "pending_verification"
            ? "Your review is saved. It goes live as soon as we have checked your name against our alumni list, usually within a day."
            : result.offeringPending
              ? "Your review is saved. It goes live once we confirm the professor and term you added, usually within a day."
              : `Your review of ${course.title} is live. The next batch can read it now.`}
        </p>
        {fields.open_to_questions ? (
          <p className={`${notice} mt-4`}>
            You are open to questions. If someone asks one, we email you a link to reply.
          </p>
        ) : null}
        <div className="mt-8 space-y-3">
          <Link href="/write" className={primaryButton}>
            Review another course
          </Link>
          <Link href="/" className={`${secondaryButton} w-full`}>
            Done for now
          </Link>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------- preview
  if (view === "preview") {
    return (
      <div>
        <p className="text-sm font-medium text-muted-foreground">{course.title}</p>
        <h1 ref={heading} tabIndex={-1} className="mt-1 type-title outline-none">
          Check your review
        </h1>
        <p className="mt-2 text-foreground/80">This is what readers will see.</p>

        {banner ? <Banner text={banner} /> : null}

        <div className={`${card} mt-5`}>
          <ReviewBody
            fields={fields}
            offeringLabel={currentOfferingLabel}
            authorDisplay={authorDisplay}
          />
        </div>

        <div className="mt-6 space-y-3">
          <button type="button" onClick={publish} disabled={busy} className={primaryButton}>
            {busy ? "Publishing…" : isPublished ? "Save changes" : "Publish review"}
          </button>
          <button
            type="button"
            onClick={() => setView(STEPS.length - 1)}
            disabled={busy}
            className={`${secondaryButton} w-full`}
          >
            Go back and edit
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------- steps
  const step = view as number;
  const total = evalTotal(fields);
  const mixStarted = EVALUATION_COMPONENTS.some((c) => fields[c.value] !== null);

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void next(step);
      }}
    >
      <p className="text-sm font-medium text-muted-foreground">
        {course.title} · {course.code}
      </p>
      <h1 ref={heading} tabIndex={-1} className="mt-1 type-title outline-none">
        {STEPS[step].title}
      </h1>
      <div
        className="mt-3 flex items-center gap-3"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={step + 1}
        aria-label={`Step ${step + 1} of ${STEPS.length}`}
      >
        <div className="flex flex-1 gap-1.5">
          {STEPS.map((s, index) => (
            <span
              key={s.title}
              className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-foreground" : "bg-border"}`}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          {step + 1} of {STEPS.length}
        </span>
      </div>

      {step === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Review the course, not the person. No personal remarks about faculty, staff or students.{" "}
          <Link href="/rules" className="underline underline-offset-4">
            Content rules
          </Link>
        </p>
      ) : null}

      {banner ? <Banner text={banner} /> : null}

      <div className="mt-6 space-y-7">
        {step === 0 ? (
          <>
            <Question
              id="offering"
              legend="Which professor and term did you take?"
              error={offeringErrors.offering}
            >
              <div className="space-y-2">
                {offerings.map((o) => (
                  <RadioRow
                    key={o.id}
                    name="offering"
                    checked={offeringChoice === o.id}
                    onChange={() => {
                      setOfferingChoice(o.id);
                      setOfferingErrors({});
                    }}
                    label={offeringLabel(o)}
                    note={
                      o.status === "pending" ? "Added by you, awaiting confirmation" : undefined
                    }
                  />
                ))}
                <RadioRow
                  name="offering"
                  checked={offeringChoice === NEW}
                  onChange={() => {
                    setOfferingChoice(NEW);
                    setOfferingErrors({});
                  }}
                  label="My professor or term is not listed"
                />
              </div>
            </Question>

            {offeringChoice === NEW ? (
              <div className={`${card} space-y-4`}>
                <div>
                  <label htmlFor="professor" className={fieldLabel}>
                    Professor
                  </label>
                  <input
                    id="professor"
                    type="text"
                    value={newOffering.professor}
                    onChange={(e) => setNewOffering((n) => ({ ...n, professor: e.target.value }))}
                    aria-invalid={offeringErrors.professor ? true : undefined}
                    className={`${fieldInput} mt-1.5`}
                  />
                  <FieldError text={offeringErrors.professor} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="term_label" className={fieldLabel}>
                      Term
                    </label>
                    <select
                      id="term_label"
                      value={newOffering.term_label}
                      onChange={(e) =>
                        setNewOffering((n) => ({ ...n, term_label: e.target.value }))
                      }
                      aria-invalid={offeringErrors.term_label ? true : undefined}
                      className={`${fieldInput} mt-1.5`}
                    >
                      <option value="">Choose…</option>
                      {TERM_LABELS.map((term) => (
                        <option key={term} value={term}>
                          {term}
                        </option>
                      ))}
                    </select>
                    <FieldError text={offeringErrors.term_label} />
                  </div>
                  <div>
                    <label htmlFor="cohort_year" className={fieldLabel}>
                      Your cohort
                    </label>
                    <select
                      id="cohort_year"
                      value={newOffering.cohort_year}
                      onChange={(e) =>
                        setNewOffering((n) => ({ ...n, cohort_year: e.target.value }))
                      }
                      aria-invalid={offeringErrors.cohort_year ? true : undefined}
                      className={`${fieldInput} mt-1.5`}
                    >
                      <option value="">Choose…</option>
                      {COHORT_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <FieldError text={offeringErrors.cohort_year} />
                  </div>
                </div>
              </div>
            ) : null}

            <Question
              id="why_taken"
              legend="Why did you take it?"
              hint="Pick all that apply."
              error={errors.why_taken}
            >
              <MultiChips
                name="why_taken"
                options={WHY_TAKEN}
                value={fields.why_taken}
                onChange={(v) => set("why_taken", v)}
              />
            </Question>

            <Question
              id="workload_band"
              legend="Weekly workload outside class"
              error={errors.workload_band}
            >
              <ChoiceChips
                name="workload_band"
                options={WORKLOAD}
                value={fields.workload_band}
                onChange={(v) => set("workload_band", v)}
              />
            </Question>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Question
              id="eval_total"
              legend="Evaluation mix"
              hint="Rough percentages are fine. Leave a part blank if it did not count."
              error={errors.eval_total}
            >
              <div className="grid grid-cols-2 gap-3">
                {EVALUATION_COMPONENTS.map((component) => (
                  <div key={component.value}>
                    <label htmlFor={component.value} className="block text-sm text-foreground">
                      {component.label}
                    </label>
                    <div className="relative mt-1">
                      <input
                        id={component.value}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        value={fields[component.value] ?? ""}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
                          set(
                            component.value as EvalKey,
                            digits === "" ? null : Math.min(Number(digits), 100),
                          );
                        }}
                        className={`${fieldInput} pr-8`}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
                        %
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p
                className={`mt-3 text-sm font-medium ${
                  total === 100 ? "text-good" : "text-muted-foreground"
                }`}
                aria-live="polite"
              >
                {!mixStarted
                  ? "Total so far: 0 of 100"
                  : total === 100
                    ? "Total: 100. That adds up."
                    : total < 100
                      ? `Total so far: ${total}. ${100 - total} to go.`
                      : `Total: ${total}. That is ${total - 100} over.`}
              </p>
            </Question>

            <Question id="grade_risk" legend="Grade risk" error={errors.grade_risk}>
              <ChoiceChips
                name="grade_risk"
                options={GRADE_RISK}
                value={fields.grade_risk}
                onChange={(v) => set("grade_risk", v)}
              />
            </Question>

            <Question
              id="grade_risk_reason"
              legend="Why that grade risk?"
              hint="For example: tight curve, one exam decides it, generous group marks."
              error={errors.grade_risk_reason}
            >
              <TextArea
                id="grade_risk_reason-input"
                rows={2}
                value={fields.grade_risk_reason}
                onChange={(v) => set("grade_risk_reason", v)}
                invalid={Boolean(errors.grade_risk_reason)}
              />
            </Question>

            <Question
              id="outline_match"
              legend="Did the outline match the course?"
              error={errors.outline_match}
            >
              <ChoiceChips
                name="outline_match"
                options={OUTLINE_MATCH}
                value={fields.outline_match}
                onChange={(v) => set("outline_match", v)}
              />
            </Question>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Question id="quant_qual" legend="Quant or qual?" error={errors.quant_qual}>
              <ChoiceChips
                name="quant_qual"
                options={QUANT_QUAL}
                value={fields.quant_qual === null ? null : String(fields.quant_qual)}
                onChange={(v) => set("quant_qual", Number(v))}
              />
            </Question>

            <Question
              id="teaching_styles"
              legend="Teaching style"
              hint="Pick all that apply."
              error={errors.teaching_styles}
            >
              <MultiChips
                name="teaching_styles"
                options={TEACHING_STYLES}
                value={fields.teaching_styles}
                onChange={(v) => set("teaching_styles", v)}
              />
            </Question>

            <Question
              id="outline_gap"
              legend="What did the outline not tell you?"
              hint="Hidden workload, sub-assignments, how classes really run."
              error={errors.outline_gap}
            >
              <TextArea
                id="outline_gap-input"
                value={fields.outline_gap}
                onChange={(v) => set("outline_gap", v)}
                minChars={MIN_REASON_CHARS}
                invalid={Boolean(errors.outline_gap)}
              />
            </Question>

            <Question id="learning_value" legend="Learning value" error={errors.learning_value}>
              <ChoiceChips
                name="learning_value"
                options={ONE_TO_FIVE}
                value={fields.learning_value === null ? null : String(fields.learning_value)}
                onChange={(v) => set("learning_value", Number(v))}
              />
            </Question>

            <Question
              id="learning_value_reason"
              legend="Why that rating?"
              hint="A rating without a reason does not help the next student."
              error={errors.learning_value_reason}
            >
              <TextArea
                id="learning_value_reason-input"
                value={fields.learning_value_reason}
                onChange={(v) => set("learning_value_reason", v)}
                minChars={MIN_REASON_CHARS}
                invalid={Boolean(errors.learning_value_reason)}
              />
            </Question>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Question
              id="who_should_take"
              legend="Who should take it?"
              hint="Fill in at least one of this and the next."
              error={errors.who_should_take}
            >
              <TextArea
                id="who_should_take-input"
                rows={2}
                value={fields.who_should_take}
                onChange={(v) => set("who_should_take", v)}
                invalid={Boolean(errors.who_should_take)}
              />
            </Question>

            <Question
              id="who_should_skip"
              legend="Who should skip it?"
              error={errors.who_should_skip}
            >
              <TextArea
                id="who_should_skip-input"
                rows={2}
                value={fields.who_should_skip}
                onChange={(v) => {
                  set("who_should_skip", v);
                  setErrors((current) => {
                    const rest = { ...current };
                    delete rest.who_should_take;
                    return rest;
                  });
                }}
              />
            </Question>

            <Question
              id="careers_helped"
              legend="Careers it helps"
              hint="Optional. Pick the specific paths, e.g. investment banking rather than finance."
              error={errors.careers_helped}
            >
              {/* One chip group per track; together they make one answer. */}
              <div className="space-y-3">
                {TRACKS.map((track) => {
                  const paths = CAREER_PATHS.filter((p) => p.track === track.value);
                  if (paths.length === 0) return null;
                  const inGroup = new Set<string>(paths.map((p) => p.value));
                  return (
                    <div key={track.value}>
                      <p className="type-label">{track.label}</p>
                      <div className="mt-1.5">
                        <MultiChips
                          name="careers_helped"
                          options={paths}
                          value={fields.careers_helped.filter((v) => inGroup.has(v))}
                          onChange={(picked) =>
                            set("careers_helped", [
                              ...fields.careers_helped.filter((v) => !inGroup.has(v)),
                              ...picked,
                            ])
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Question>

            <Question
              id="visibility"
              legend="How should you appear?"
              hint="Moderators can always see who wrote an entry."
            >
              <div className="space-y-2">
                <RadioRow
                  name="visibility"
                  checked={fields.visibility === "named"}
                  onChange={() => set("visibility", "named")}
                  label="Show my name"
                  note={`Appears as “${author.name}, ${author.cohort}”`}
                />
                <RadioRow
                  name="visibility"
                  checked={fields.visibility === "anonymous"}
                  onChange={() => set("visibility", "anonymous")}
                  label="Keep my name hidden"
                  note={`Appears as “Verified ${author.cohort} student”`}
                />
              </div>
            </Question>

            <Toggle
              id="open_to_questions"
              label="Open to questions"
              description="Readers can ask you a follow-up under your review. We email you; replies are public."
              checked={fields.open_to_questions}
              onChange={(v) => set("open_to_questions", v)}
            />

            {isModerator ? (
              <div className={`${card} space-y-3`}>
                <p className="text-sm font-semibold text-foreground">
                  Moderators only: entering this for someone else?
                </p>
                <p className="text-sm text-muted-foreground">
                  Only with their consent. Leave blank if this is your own review.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="behalf_name" className={fieldLabel}>
                      Their name
                    </label>
                    <input
                      id="behalf_name"
                      type="text"
                      value={onBehalf.name}
                      onChange={(e) => setOnBehalf((b) => ({ ...b, name: e.target.value }))}
                      className={`${fieldInput} mt-1.5`}
                    />
                  </div>
                  <div>
                    <label htmlFor="behalf_cohort" className={fieldLabel}>
                      Their cohort
                    </label>
                    <select
                      id="behalf_cohort"
                      value={onBehalf.cohort}
                      onChange={(e) => setOnBehalf((b) => ({ ...b, cohort: e.target.value }))}
                      className={`${fieldInput} mt-1.5`}
                    >
                      <option value="">Choose…</option>
                      {COHORT_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="mt-8 flex gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => {
              setBanner(null);
              setView(step - 1);
            }}
            disabled={busy}
            className={secondaryButton}
          >
            Back
          </button>
        ) : null}
        <button type="submit" disabled={busy} className={`${primaryButton} flex-1`}>
          {busy ? "Saving…" : step === STEPS.length - 1 ? "Preview" : "Continue"}
        </button>
      </div>

      <p className="mt-3 text-center text-sm text-muted-foreground">
        {isPublished
          ? "Changes are saved when you press Save changes on the preview."
          : "Your answers save as you go."}
      </p>

      {reviewId ? (
        confirmingDelete ? (
          <div role="alert" className="mt-8 rounded-md border border-critical bg-card p-4">
            <p className="font-medium text-foreground">
              {isPublished ? "Delete this review?" : "Delete this draft?"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isPublished
                ? "It disappears for every reader, with its questions and answers. This cannot be undone."
                : "Your answers so far are removed. This cannot be undone."}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button type="button" onClick={remove} disabled={busy} className={dangerButton}>
                {busy ? "Deleting…" : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={busy}
                className={secondaryButton}
              >
                Keep it
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={busy}
              className="min-h-11 px-2 text-sm text-destructive underline underline-offset-4"
            >
              {isPublished ? "Delete this review" : "Delete this draft"}
            </button>
          </p>
        )
      ) : null}
    </form>
  );
}

function Banner({ text }: { text: string }) {
  return (
    <p role="alert" className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
      {text}
    </p>
  );
}

function FieldError({ text }: { text?: string }) {
  return text ? (
    <p role="alert" className="mt-1 text-sm font-medium text-destructive">
      {text}
    </p>
  ) : null;
}

function RadioRow({
  name,
  checked,
  onChange,
  label,
  note,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  note?: string;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-input p-3 has-checked:border-foreground has-checked:bg-background">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 size-5 shrink-0 accent-foreground"
      />
      <span>
        <span className="block text-base text-foreground">{label}</span>
        {note ? <span className="block text-sm text-muted-foreground">{note}</span> : null}
      </span>
    </label>
  );
}
