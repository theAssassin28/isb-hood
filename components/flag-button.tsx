"use client";

import { useActionState, useState } from "react";
import { flagContent, type FlagState } from "@/app/(app)/courses/comment-actions";
import { FLAG_REASONS } from "@/lib/domain/flags";
import { fieldInput, secondaryButton } from "./styles";

const initial: FlagState = { status: "idle", message: null };

export function FlagButton({
  targetType,
  targetId,
  label = "Flag",
}: {
  targetType: "course_review" | "career_entry" | "comment";
  targetId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(flagContent, initial);

  if (state.status === "done") {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {state.message}
      </p>
    );
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center px-1 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        {label}
      </button>
    );
  }

  const selectId = `flag-reason-${targetId}`;
  return (
    <form action={formAction} className="mt-2 w-full space-y-2 rounded-md border border-border p-3">
      <input type="hidden" name="target_type" value={targetType} />
      <input type="hidden" name="target_id" value={targetId} />
      <label htmlFor={selectId} className="block text-sm font-medium text-foreground">
        What is wrong with it?
      </label>
      <select id={selectId} name="reason" required defaultValue="" className={fieldInput}>
        <option value="" disabled>
          Choose…
        </option>
        {FLAG_REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <label htmlFor={`${selectId}-note`} className="sr-only">
        Anything to add (optional)
      </label>
      <input
        id={`${selectId}-note`}
        name="note"
        type="text"
        maxLength={300}
        placeholder="Anything to add (optional)"
        className={fieldInput}
      />
      {state.status === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={secondaryButton}>
          {pending ? "Sending…" : "Send to moderators"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-11 px-2 text-sm text-muted-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
