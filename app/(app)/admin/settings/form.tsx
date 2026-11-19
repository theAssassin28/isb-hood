"use client";

import { useActionState } from "react";
import { fieldInput, fieldLabel, primaryButton } from "@/components/styles";
import { COHORTS } from "@/lib/constants/vocab";
import type { AppSettings } from "@/lib/domain/settings";
import { TERM_LABELS } from "@/lib/schemas/courseReview";
import { saveSettings, type SettingsState } from "./actions";

export function SettingsForm({ current }: { current: AppSettings }) {
  const [state, formAction, pending] = useActionState(saveSettings, {
    saved: false,
    errors: {},
    values: null,
    version: 0,
  } satisfies SettingsState);

  // After a rejected save, show what was submitted, not the stored values.
  const v = state.values;
  const val = (name: string, stored: string) => (v ? (v[name] ?? "") : stored);
  const checked = (name: keyof AppSettings, stored: boolean) => (v ? v[name] === "on" : stored);
  const err = (key: keyof AppSettings) =>
    state.errors[key] ? (
      <p role="alert" className="mt-1 text-sm text-destructive">
        {state.errors[key]}
      </p>
    ) : null;

  return (
    <form key={state.version} action={formAction} className="space-y-8">
      {state.saved ? (
        <p role="status" className="rounded-md border border-good bg-card p-3 text-sm">
          Saved. Changes apply on the next page load.
        </p>
      ) : null}
      {Object.keys(state.errors).length > 0 ? (
        <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Nothing was saved. Fix the marked fields.
        </p>
      ) : null}

      <Group title="Who can read what">
        <Check
          name="yl_read_open"
          label="PGP YL students can read course reviews"
          note="Plan: on 21 Dec."
          checked={checked("yl_read_open", current.yl_read_open)}
        />
        <Check
          name="careers_write_open"
          label="Career forms open to contributors"
          note="Plan: about 21 Dec, only if course supply is at 50% or more."
          checked={checked("careers_write_open", current.careers_write_open)}
        />
        <Check
          name="careers_read_open"
          label="Career entries open to readers"
          note="Plan: 28 Dec."
          checked={checked("careers_read_open", current.careers_read_open)}
        />
        <div>
          <label htmlFor="min_reviews_to_open_course" className={fieldLabel}>
            Hide courses with fewer reviews than
          </label>
          <p className="text-sm text-muted-foreground">
            0 shows every course. Set to 3 if supply lands at 50 to 99%.
          </p>
          <input
            id="min_reviews_to_open_course"
            name="min_reviews_to_open_course"
            type="number"
            min={0}
            max={50}
            inputMode="numeric"
            defaultValue={val(
              "min_reviews_to_open_course",
              String(current.min_reviews_to_open_course),
            )}
            className={`${fieldInput} mt-1.5 w-28`}
          />
          {err("min_reviews_to_open_course")}
        </div>
      </Group>

      <Group title="Bidding">
        <div>
          <label htmlFor="bid_term_label" className={fieldLabel}>
            Term being bid for
          </label>
          <select
            id="bid_term_label"
            name="bid_term_label"
            defaultValue={val("bid_term_label", current.bid_term_label)}
            className={`${fieldInput} mt-1.5`}
          >
            {TERM_LABELS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {err("bid_term_label")}
        </div>
        <Window
          name="bid_window"
          label="Bidding window"
          note="The course list defaults to this term from a week before."
          start={val("bid_window_start", current.bid_window.start)}
          end={val("bid_window_end", current.bid_window.end)}
          error={state.errors.bid_window}
        />
      </Group>

      <Group title="Surveys">
        <Window
          name="post_bid_survey_window"
          label="Post-bid survey window"
          note="Prompt and email go to eligible readers on these days."
          start={val("post_bid_survey_window_start", current.post_bid_survey_window.start)}
          end={val("post_bid_survey_window_end", current.post_bid_survey_window.end)}
          error={state.errors.post_bid_survey_window}
        />
        <div>
          <label htmlFor="post_bid_survey_cohort" className={fieldLabel}>
            Cohort asked
          </label>
          <select
            id="post_bid_survey_cohort"
            name="post_bid_survey_cohort"
            defaultValue={val("post_bid_survey_cohort", current.post_bid_survey_cohort)}
            className={`${fieldInput} mt-1.5`}
          >
            {COHORTS.filter((c) => c.value !== "other").map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          {err("post_bid_survey_cohort")}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="career_followup_days" className={fieldLabel}>
              Career follow-up after (days)
            </label>
            <input
              id="career_followup_days"
              name="career_followup_days"
              type="number"
              min={1}
              max={60}
              inputMode="numeric"
              defaultValue={val("career_followup_days", String(current.career_followup_days))}
              className={`${fieldInput} mt-1.5`}
            />
            {err("career_followup_days")}
          </div>
          <div>
            <label htmlFor="career_followup_deadline" className={fieldLabel}>
              Follow-up deadline
            </label>
            <input
              id="career_followup_deadline"
              name="career_followup_deadline"
              type="date"
              defaultValue={val("career_followup_deadline", current.career_followup_deadline)}
              className={`${fieldInput} mt-1.5`}
            />
            {err("career_followup_deadline")}
          </div>
        </div>
      </Group>

      <Group title="Sign-in">
        <div>
          <label htmlFor="allowed_reader_domains" className={fieldLabel}>
            ISB email domains
          </label>
          <p className="text-sm text-muted-foreground">
            Exact domains, separated by commas. Anyone else can only contribute through an outreach
            link.
          </p>
          <input
            id="allowed_reader_domains"
            name="allowed_reader_domains"
            type="text"
            defaultValue={val("allowed_reader_domains", current.allowed_reader_domains.join(", "))}
            className={`${fieldInput} mt-1.5`}
          />
          {err("allowed_reader_domains")}
        </div>
      </Group>

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="type-label">{title}</legend>
      {children}
    </fieldset>
  );
}

function Check({
  name,
  label,
  note,
  checked,
}: {
  name: string;
  label: string;
  note: string;
  checked: boolean;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-input p-3">
      <input
        name={name}
        type="checkbox"
        defaultChecked={checked}
        className="mt-0.5 size-5 shrink-0 accent-foreground"
      />
      <span>
        <span className="block text-base text-foreground">{label}</span>
        <span className="block text-sm text-muted-foreground">{note}</span>
      </span>
    </label>
  );
}

function Window({
  name,
  label,
  note,
  start,
  end,
  error,
}: {
  name: string;
  label: string;
  note: string;
  start: string;
  end: string;
  error?: string;
}) {
  return (
    <fieldset>
      <legend className={fieldLabel}>{label}</legend>
      <p className="text-sm text-muted-foreground">{note}</p>
      <div className="mt-1.5 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${name}_start`} className="block text-sm text-muted-foreground">
            From
          </label>
          <input
            id={`${name}_start`}
            name={`${name}_start`}
            type="date"
            defaultValue={start}
            className={fieldInput}
          />
        </div>
        <div>
          <label htmlFor={`${name}_end`} className="block text-sm text-muted-foreground">
            To (inclusive)
          </label>
          <input
            id={`${name}_end`}
            name={`${name}_end`}
            type="date"
            defaultValue={end}
            className={fieldInput}
          />
        </div>
      </div>
      {error ? (
        <p role="alert" className="mt-1 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
