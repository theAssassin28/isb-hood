"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { fieldInput, primaryButton } from "@/components/styles";
import { CAREER_ACTIONS, type SurveyState } from "@/lib/domain/surveys";
import { submitCareerFollowup } from "../actions";

const initial: SurveyState = { status: "idle", message: null, errors: {} };

export function CareerFollowupForm() {
  const [state, formAction, pending] = useActionState(submitCareerFollowup, initial);
  const [action, setAction] = useState("");
  const [text, setText] = useState("");

  if (state.status === "done") {
    return (
      <div role="status">
        <p className="type-title">Thank you</p>
        <p className="mt-2 text-foreground/90">That is exactly what we needed to know.</p>
        <Link href="/" className={`${primaryButton} mt-6`}>
          Back to ISB Hood
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.message ? (
        <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
      <fieldset>
        <legend className="text-base font-semibold text-foreground">
          Name one thing you did because of a career entry
        </legend>
        <div className="mt-2 space-y-2">
          {CAREER_ACTIONS.map((o) => (
            <label
              key={o.value}
              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-input p-3 has-checked:border-foreground has-checked:bg-background"
            >
              <input
                type="radio"
                name="career_action"
                value={o.value}
                checked={action === o.value}
                onChange={() => setAction(o.value)}
                className="mt-0.5 size-5 shrink-0 accent-foreground"
              />
              <span className="text-base text-foreground">{o.label}</span>
            </label>
          ))}
        </div>
        {state.errors.career_action ? (
          <p role="alert" className="mt-1 text-sm font-medium text-destructive">
            {state.errors.career_action}
          </p>
        ) : null}
      </fieldset>

      {action !== "none" ? (
        <div>
          <label htmlFor="action_text" className="text-base font-semibold text-foreground">
            In one line, what did you do?
          </label>
          <p className="text-sm text-muted-foreground">
            For example: “Applied to two product roles I would have skipped”. No pay or offer
            amounts.
          </p>
          <input
            id="action_text"
            name="action_text"
            type="text"
            maxLength={300}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={`${fieldInput} mt-2`}
          />
          {state.errors.action_text ? (
            <p role="alert" className="mt-1 text-sm font-medium text-destructive">
              {state.errors.action_text}
            </p>
          ) : null}
        </div>
      ) : null}

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
