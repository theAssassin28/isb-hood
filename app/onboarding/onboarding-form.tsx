"use client";

import { useActionState } from "react";
import { fieldInput, fieldLabel } from "@/components/styles";
import { SubmitButton } from "@/components/submit-button";
import {
  COHORTS,
  FUNCTIONS,
  HEARD_FROM,
  INDUSTRIES,
  PROGRAMMES,
  TRACKS,
  YEARS_EXPERIENCE_BANDS,
} from "@/lib/constants/vocab";
import type { ProfileField } from "@/lib/schemas/profile";
import { completeProfile, type OnboardingState } from "./actions";

type Option = { value: string; label: string };

const YEARS: Option[] = YEARS_EXPERIENCE_BANDS.map((band) => ({
  value: band,
  label: `${band} years`,
}));

export function OnboardingForm({
  defaults,
  askHeardFrom,
  isContributor,
}: {
  defaults: Partial<Record<ProfileField, string>>;
  askHeardFrom: boolean;
  isContributor: boolean;
}) {
  const initial: OnboardingState = { errors: {}, message: null, values: defaults };
  const [state, formAction] = useActionState(completeProfile, initial);

  const select = (name: ProfileField, label: string, options: readonly Option[], hint?: string) => {
    const error = state.errors[name];
    return (
      <div>
        <label htmlFor={name} className={fieldLabel}>
          {label}
        </label>
        {hint ? (
          <p id={`${name}-hint`} className="mt-0.5 text-sm text-muted-foreground">
            {hint}
          </p>
        ) : null}
        <select
          id={name}
          name={name}
          required
          defaultValue={state.values[name] ?? ""}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [hint ? `${name}-hint` : null, error ? `${name}-error` : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className={`${fieldInput} mt-1.5`}
        >
          <option value="" disabled>
            Choose…
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error ? (
          <p id={`${name}-error`} className="mt-1 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.message ? (
        <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <div>
        <label htmlFor="full_name" className={fieldLabel}>
          Your name
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          required
          defaultValue={state.values.full_name ?? ""}
          aria-invalid={state.errors.full_name ? true : undefined}
          aria-describedby={state.errors.full_name ? "full_name-error" : undefined}
          className={`${fieldInput} mt-1.5`}
        />
        {state.errors.full_name ? (
          <p id="full_name-error" className="mt-1 text-sm text-destructive">
            {state.errors.full_name}
          </p>
        ) : null}
      </div>

      {select("programme", "Programme", PROGRAMMES)}
      {select("cohort", "Cohort", COHORTS)}
      {select("background_function", "Pre-MBA function", FUNCTIONS)}
      {select("background_industry", "Pre-MBA industry", INDUSTRIES)}
      {select("years_experience_band", "Years of experience before ISB", YEARS)}
      {select(
        "target_track",
        isContributor ? "Track you went into" : "Target track",
        TRACKS,
        isContributor
          ? "Helps students with your background find your entries."
          : "Used to show you entries from people like you.",
      )}
      {askHeardFrom ? select("heard_from", "How did you hear about ISB Hood?", HEARD_FROM) : null}

      <SubmitButton pendingLabel="Saving…">Continue</SubmitButton>
    </form>
  );
}
