"use client";

import { useState, useTransition } from "react";
import { leaveContact, recordFakeDoor, type Door } from "@/app/(app)/fake-door-actions";
import { primaryButtonInline, secondaryButton } from "./styles";

const COPY: Record<Door, { button: string; title: string; body: string }> = {
  request_chat: {
    button: "Request a chat",
    title: "Private chats are coming soon",
    body: "We are checking how many people want to talk to authors one to one before building it. Want early access? We will email you when it is ready.",
  },
  find_people: {
    button: "Find people like me",
    title: "Finding people like you is coming soon",
    body: "We are checking how many people want this before building it. Want early access? We will email you when it is ready.",
  },
};

/**
 * A button for a feature that is not built yet (docs/BUILD_PLAN.md 4.8). It
 * records the click, says so honestly, and offers early access. "Request a
 * chat" also offers the public question, so it is never a dead end.
 */
export function FakeDoor({ door, entryId }: { door: Door; entryId: string | null }) {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState<"yes" | "no" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const copy = COPY[door];

  const askPublicly = () => {
    if (!entryId) return;
    const box = document.getElementById(`comment-${entryId}`) as HTMLTextAreaElement | null;
    const details = box?.closest("details");
    if (details) details.open = true;
    setOpen(false);
    requestAnimationFrame(() => {
      box?.scrollIntoView({ block: "center" });
      box?.focus({ preventScroll: true });
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          recordFakeDoor(door, entryId).catch(() => {});
        }}
        className="inline-flex min-h-11 items-center px-1 text-sm font-medium text-brand underline underline-offset-4"
      >
        {copy.button}
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label={copy.title}
      className="mt-2 w-full rounded-md border border-brand bg-card p-3"
    >
      <p className="font-semibold text-foreground">{copy.title}</p>
      {answer === "yes" ? (
        <p role="status" className="mt-1 text-sm text-foreground">
          Thanks. We will email you when it is ready.
        </p>
      ) : answer === "no" ? null : (
        <>
          <p className="mt-1 text-sm text-foreground">{copy.body}</p>
          {error ? (
            <p role="alert" className="mt-1 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              className={primaryButtonInline}
              onClick={() =>
                startTransition(async () => {
                  const result = await leaveContact(door, entryId).catch(() => ({
                    error: "That did not save. Try again.",
                  }));
                  if (result.error) setError(result.error);
                  else setAnswer("yes");
                })
              }
            >
              {pending ? "Saving…" : "Yes, early access"}
            </button>
            <button type="button" onClick={() => setAnswer("no")} className={secondaryButton}>
              No thanks
            </button>
          </div>
        </>
      )}
      <div className="mt-2 flex flex-wrap gap-x-4">
        {door === "request_chat" && entryId ? (
          <button
            type="button"
            onClick={askPublicly}
            className="inline-flex min-h-11 items-center text-sm font-medium text-brand underline underline-offset-4"
          >
            Ask a public question instead
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4"
        >
          Close
        </button>
      </div>
    </div>
  );
}
