"use client";

import { useActionState } from "react";
import { dangerButton, fieldInput, fieldLabel, primaryButton } from "@/components/styles";
import { decideContributor, type VerifyState } from "./actions";

export type MatchOption = { id: string; label: string };

const initial: VerifyState = { error: null };

export function DecisionForm({
  targetId,
  personName,
  matches,
}: {
  targetId: string;
  personName: string;
  matches: MatchOption[];
}) {
  const [state, formAction, pending] = useActionState(decideContributor, initial);
  const selectId = `contact-${targetId}`;

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input type="hidden" name="target" value={targetId} />

      {matches.length > 0 ? (
        <div>
          <label htmlFor={selectId} className={fieldLabel}>
            Outreach list match
          </label>
          <select
            id={selectId}
            name="contact"
            defaultValue={matches[0].id}
            className={`${fieldInput} mt-1.5`}
          >
            {matches.map((match) => (
              <option key={match.id} value={match.id}>
                {match.label}
              </option>
            ))}
            <option value="">None of these</option>
          </select>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No likely match in the outreach list. Check another way before verifying.
        </p>
      )}

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          name="decision"
          value="verify"
          disabled={pending}
          className={`${primaryButton} flex-1`}
          aria-label={`Verify ${personName}`}
        >
          Verify
        </button>
        <button
          type="submit"
          name="decision"
          value="reject"
          disabled={pending}
          className={dangerButton}
          aria-label={`Reject ${personName}`}
        >
          Reject
        </button>
      </div>
    </form>
  );
}
