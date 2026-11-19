"use client";

import { useState, useTransition } from "react";

/**
 * A button that runs a server action and shows its error next to itself.
 * Pass the action already bound to its arguments.
 */
export function ActionButton({
  action,
  children,
  className,
  confirmText,
  pendingLabel = "Working…",
}: {
  action: () => Promise<{ error: string | null }>;
  children: React.ReactNode;
  className: string;
  confirmText?: string;
  pendingLabel?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        className={className}
        onClick={() => {
          if (confirmText && !window.confirm(confirmText)) return;
          startTransition(async () => {
            try {
              const result = await action();
              setError(result.error);
            } catch {
              setError("That did not work. Try again.");
            }
          });
        }}
      >
        {pending ? pendingLabel : children}
      </button>
      {error ? (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      ) : null}
    </span>
  );
}
