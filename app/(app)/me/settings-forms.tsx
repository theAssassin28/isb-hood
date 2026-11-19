"use client";

import { useActionState } from "react";
import { dangerButton, fieldInput, secondaryButton } from "@/components/styles";
import { deleteAccount, updateNotifyPref, type DeleteState, type PrefState } from "./actions";

const OPTIONS = [
  {
    value: "instant",
    label: "Right away",
    note: "An email for each question on your reviews and each answer to yours.",
  },
  {
    value: "daily",
    label: "Once a day",
    note: "One email each morning, only if something happened.",
  },
  { value: "off", label: "No emails", note: "Check My activity yourself." },
] as const;

export function NotifyPrefForm({ current }: { current: "instant" | "daily" | "off" }) {
  const [state, formAction, pending] = useActionState(updateNotifyPref, {
    saved: false,
    error: null,
  } satisfies PrefState);
  return (
    <form action={formAction} className="space-y-2">
      <fieldset className="space-y-2">
        <legend className="sr-only">How should we email you?</legend>
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-input p-3 has-checked:border-foreground has-checked:bg-background"
          >
            <input
              type="radio"
              name="notify_pref"
              value={o.value}
              defaultChecked={current === o.value}
              className="mt-0.5 size-5 shrink-0 accent-foreground"
            />
            <span>
              <span className="block text-base text-foreground">{o.label}</span>
              <span className="block text-sm text-muted-foreground">{o.note}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.saved && !pending ? (
        <p role="status" className="text-sm text-foreground">
          Saved.
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={secondaryButton}>
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState(deleteAccount, {
    error: null,
  } satisfies DeleteState);
  return (
    <form action={formAction} className="space-y-2">
      <p className="text-sm text-foreground/80">
        This removes your reviews and profile. Your comments are replaced with “deleted” so other
        people’s threads still make sense. It cannot be undone from here.
      </p>
      <label htmlFor="confirm-delete" className="block text-sm font-medium text-foreground">
        Type <span className="font-mono">delete</span> to confirm
      </label>
      <input
        id="confirm-delete"
        name="confirm"
        type="text"
        autoComplete="off"
        className={fieldInput}
        aria-invalid={state.error ? true : undefined}
      />
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={dangerButton}>
        {pending ? "Deleting…" : "Delete my account"}
      </button>
    </form>
  );
}
