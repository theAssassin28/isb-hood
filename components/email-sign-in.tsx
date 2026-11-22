"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { requestCode, verifyCode, type SignInState } from "@/lib/auth/actions";
import { errorBox, fieldInput, fieldLabel, notice, primaryButton, quietAction } from "./styles";

/** Two short bars and a label: where the person is in the two steps. Ink only, no accent. */
function Steps({ at }: { at: 1 | 2 }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex flex-1 gap-1.5" aria-hidden="true">
        <span className="h-1 flex-1 rounded-full bg-foreground" />
        <span className={`h-1 flex-1 rounded-full ${at === 2 ? "bg-foreground" : "bg-border"}`} />
      </div>
      <p className="shrink-0 text-sm text-muted-foreground">
        Step {at} of 2 · {at === 1 ? "Your email" : "The code"}
      </p>
    </div>
  );
}

/**
 * Two steps: an email address, then the 6-digit code we email to it.
 * `intent` records which door the person used (ISB reader or contributor).
 */
export function EmailSignIn({
  intent,
  src,
  course,
  next,
  placeholder = "name@isb.edu",
  prototype = false,
}: {
  intent: "reader" | "contributor";
  src?: string | null;
  course?: string | null;
  next?: string | null;
  placeholder?: string;
  /** The clickable prototype: no email is sent and any 6-digit code is accepted. */
  prototype?: boolean;
}) {
  const initial: SignInState = { step: "email", email: "", message: null, sentAt: 0 };
  const [sent, sendAction, sending] = useActionState(requestCode, initial);
  const [checked, checkAction, checking] = useActionState(verifyCode, initial);
  const [changing, setChanging] = useState(false);
  const [email, setEmail] = useState("");
  // Which form was submitted last decides whose message shows.
  const [last, setLast] = useState<"send" | "check">("send");
  const codeBox = useRef<HTMLInputElement>(null);

  const onCode = sent.step === "code" && !changing;
  const codeMessage = last === "check" ? checked.message : sent.message;

  useEffect(() => {
    if (onCode) codeBox.current?.focus();
  }, [onCode, sent.sentAt]);

  const hidden = (
    <>
      <input type="hidden" name="intent" value={intent} />
      {src ? <input type="hidden" name="src" value={src} /> : null}
      {course ? <input type="hidden" name="course" value={course} /> : null}
      {next ? <input type="hidden" name="next" value={next} /> : null}
    </>
  );

  if (!onCode) {
    return (
      <form
        action={(formData) => {
          setChanging(false);
          setLast("send");
          sendAction(formData);
        }}
        className="space-y-3"
        noValidate
      >
        <Steps at={1} />
        {hidden}
        <div>
          <label htmlFor={`email-${intent}`} className={fieldLabel}>
            Email address
          </label>
          <input
            id={`email-${intent}`}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            placeholder={placeholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${fieldInput} mt-1.5`}
          />
        </div>
        {sent.message && sent.step === "email" ? (
          <p role="alert" className={errorBox}>
            {sent.message}
          </p>
        ) : null}
        <button type="submit" disabled={sending} className={primaryButton}>
          {sending ? "Sending a code…" : "Email me a sign-in code"}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      <Steps at={2} />
      <div>
        <p className="text-foreground">We sent a 6-digit code to</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3">
          <span className="type-tag max-w-full break-all">{sent.email}</span>
          <button
            type="button"
            onClick={() => {
              setEmail(sent.email);
              setChanging(true);
            }}
            className={quietAction}
          >
            Change
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          It can take a minute; check junk mail too.
        </p>
      </div>
      {prototype ? (
        <p className={notice}>
          <span className="type-status text-warn">Prototype</span>
          <span className="mt-1 block text-muted-foreground">
            No email is sent here. Type any 6 digits to continue.
          </span>
        </p>
      ) : null}
      <form
        action={(formData) => {
          setLast("check");
          checkAction(formData);
        }}
        className="space-y-3"
        noValidate
      >
        <input type="hidden" name="email" value={sent.email} />
        <div>
          <label htmlFor={`code-${intent}`} className={fieldLabel}>
            Code from the email
          </label>
          <input
            key={sent.sentAt}
            ref={codeBox}
            id={`code-${intent}`}
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={10}
            required
            placeholder="······"
            className={`${fieldInput} mt-1.5 min-h-14 text-center font-mono text-2xl tracking-[0.5em] placeholder:tracking-[0.5em]`}
          />
        </div>
        {codeMessage ? (
          <p role="alert" className={errorBox}>
            {codeMessage}
          </p>
        ) : null}
        <button type="submit" disabled={checking} className={primaryButton}>
          {checking ? "Checking…" : "Sign in"}
        </button>
      </form>
      <div className="flex flex-wrap gap-x-5">
        <form
          action={(formData) => {
            setLast("send");
            sendAction(formData);
          }}
        >
          {hidden}
          <input type="hidden" name="email" value={sent.email} />
          <button type="submit" disabled={sending} className={quietAction}>
            {sending ? "Sending…" : "No email? Send a new code"}
          </button>
        </form>
      </div>
    </div>
  );
}
