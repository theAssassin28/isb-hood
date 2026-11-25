"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Prototype only. The signed-in persona's demo script, on demand: a floating
// "Demo script" button at the bottom right of every app page opens it in a
// side panel. It opens by itself the first time a persona arrives, so a tester
// with no context still finds it; after that it stays closed until asked for.

export type DockScript = {
  personaId: string;
  name: string;
  role?: string;
  shows: string;
  steps: { text: string; href?: string; link?: string }[];
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export function DemoScriptDock({ script }: { script: DockScript }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  // First visit for this persona: open once (stored per browser).
  useEffect(() => {
    const key = `ih-script-seen-${script.personaId}`;
    let seen = true;
    try {
      seen = localStorage.getItem(key) === "1";
    } catch {
      // Storage blocked: never auto-open.
    }
    if (seen) return;
    // Marked as seen only when it really opens, so an effect that runs twice
    // (React development mode) does not mark it and then cancel the opening.
    const frame = requestAnimationFrame(() => {
      try {
        localStorage.setItem(key, "1");
      } catch {
        // Ignore: it will simply open again next time.
      }
      setOpen(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [script.personaId]);

  // Focus the panel on open; Esc closes and returns focus to the button.
  useEffect(() => {
    if (!open) return;
    heading.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {open ? (
        <section
          role="dialog"
          aria-labelledby="demo-script-title"
          className="fixed right-4 bottom-[calc(4rem+env(safe-area-inset-bottom)+8.5rem)] z-50 flex max-h-[min(70dvh,36rem)] w-[min(24rem,calc(100vw-2rem))] flex-col rounded-lg border-2 border-warn bg-card lg:right-6 lg:bottom-40"
        >
          <header className="flex items-start gap-3 border-b border-border p-4">
            <span
              aria-hidden="true"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-foreground font-display text-base text-foreground"
            >
              {initials(script.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="type-status text-warn">Prototype · demo script</p>
              <h2
                id="demo-script-title"
                ref={heading}
                tabIndex={-1}
                className="type-heading outline-none"
              >
                You are {script.name}
                {script.role ? `, ${script.role}` : ""}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                button.current?.focus();
              }}
              aria-label="Close the demo script"
              className="-mt-1 -mr-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </header>
          <div className="overflow-y-auto p-4">
            <p className="text-sm text-muted-foreground">{script.shows}.</p>
            <ol className="mt-4 space-y-3">
              {script.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-foreground">{step.text}</p>
                    {step.href ? (
                      <Link
                        href={step.href}
                        onClick={() => setOpen(false)}
                        className="inline-flex min-h-11 items-center text-sm font-medium text-brand underline underline-offset-4"
                      >
                        {step.link ?? "Go"} →
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {/* Above the tab bar and the pinned write button on phones; clear of the
          write bar on desktop. Ink fill, so the page's blue button stays the
          one accent action. */}
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="fixed right-4 bottom-[calc(4rem+env(safe-area-inset-bottom)+5rem)] z-50 inline-flex min-h-11 items-center gap-2 rounded-full border border-background bg-foreground px-4 text-sm font-medium text-background active:translate-y-px lg:right-6 lg:bottom-24"
      >
        <span aria-hidden="true" className="inline-block size-2 rounded-full bg-warn" />
        {open ? "Close script" : "Demo script"}
      </button>
    </>
  );
}
