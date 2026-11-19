"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { fieldInput, primaryButton } from "@/components/styles";
import { BID_EFFECTS, SENIORS_BANDS, type SurveyState } from "@/lib/domain/surveys";
import { submitPostBid } from "../actions";

const initial: SurveyState = { status: "idle", message: null, errors: {} };

export function PostBidForm({
  courses,
  bidTerm,
}: {
  courses: { id: string; title: string; code: string }[];
  bidTerm: string;
}) {
  const [state, formAction, pending] = useActionState(submitPostBid, initial);
  // Controlled, so an error never wipes the answers.
  const [effect, setEffect] = useState("");
  const [changed, setChanged] = useState<string[]>([]);
  const [seniors, setSeniors] = useState("");
  const [note, setNote] = useState("");

  if (state.status === "done") {
    return (
      <div role="status">
        <p className="type-title">Thank you</p>
        <p className="mt-2 text-foreground/90">
          Your answers decide whether ISB Hood carries on for the next batch.
        </p>
        <Link href="/" className={`${primaryButton} mt-6`}>
          Back to ISB Hood
        </Link>
      </div>
    );
  }

  const error = (key: string) =>
    state.errors[key] ? (
      <p role="alert" className="mt-1 text-sm font-medium text-destructive">
        {state.errors[key]}
      </p>
    ) : null;

  return (
    <form action={formAction} className="space-y-7" noValidate>
      {state.message ? (
        <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <fieldset>
        <legend className="text-base font-semibold text-foreground">
          Did ISB Hood change any of your {bidTerm} bids?
        </legend>
        <div className="mt-2 space-y-2">
          {BID_EFFECTS.map((o) => (
            <Choice
              key={o.value}
              type="radio"
              name="bid_effect"
              value={o.value}
              checked={effect === o.value}
              onChange={() => setEffect(o.value)}
              label={o.label}
            />
          ))}
        </div>
        {error("bid_effect")}
      </fieldset>

      {effect === "changed" ? (
        <fieldset>
          <legend className="text-base font-semibold text-foreground">
            Which course or courses?
          </legend>
          <p className="text-sm text-muted-foreground">Tick each course whose bid you changed.</p>
          <div className="mt-2 space-y-2">
            {courses.map((c) => (
              <Choice
                key={c.id}
                type="checkbox"
                name="changed_course_ids"
                value={c.id}
                checked={changed.includes(c.id)}
                onChange={() =>
                  setChanged((list) =>
                    list.includes(c.id) ? list.filter((x) => x !== c.id) : [...list, c.id],
                  )
                }
                label={`${c.title} · ${c.code}`}
              />
            ))}
          </div>
          {error("changed_course_ids")}
        </fieldset>
      ) : null}

      <fieldset>
        <legend className="text-base font-semibold text-foreground">
          How many seniors did you ask about electives this time?
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {SENIORS_BANDS.map((band) => (
            <label
              key={band}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-input bg-card px-4 has-checked:border-foreground has-checked:bg-foreground has-checked:text-background has-focus-visible:outline-2 has-focus-visible:outline-foreground"
            >
              <input
                type="radio"
                name="seniors_asked_band"
                value={band}
                checked={seniors === band}
                onChange={() => setSeniors(band)}
                className="sr-only"
              />
              {band}
            </label>
          ))}
        </div>
        {error("seniors_asked_band")}
      </fieldset>

      <div>
        <label htmlFor="note" className="text-base font-semibold text-foreground">
          Anything else? <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={`${fieldInput} mt-2 py-2.5`}
        />
        {error("note")}
      </div>

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Sending…" : "Send answers"}
      </button>
    </form>
  );
}

function Choice(props: {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-input p-3 has-checked:border-foreground has-checked:bg-background">
      <input
        type={props.type}
        name={props.name}
        value={props.value}
        checked={props.checked}
        onChange={props.onChange}
        className="mt-0.5 size-5 shrink-0 accent-foreground"
      />
      <span className="text-base text-foreground">{props.label}</span>
    </label>
  );
}
