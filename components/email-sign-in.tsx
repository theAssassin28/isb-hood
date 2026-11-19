"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { requestCode, verifyCode, type SignInState } from "@/lib/auth/actions";
import { errorBox, fieldInput, fieldLabel, primaryButton, quietAction } from "./styles";

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
}: {
  intent: "reader" | "contributor";
  src?: string | null;
  course?: string | null;
  next?: string | null;
  placeholder?: string;
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
      <p className="text-foreground">
        We sent a 6-digit code to <span className="font-medium break-all">{sent.email}</span>. It
        can take a minute; check junk mail too.
      </p>
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
            className={`${fieldInput} mt-1.5 text-lg tracking-[0.3em]`}
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
            {sending ? "Sending…" : "Send a new code"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => {
            setEmail(sent.email);
            setChanging(true);
          }}
          className={quietAction}
        >
          Use a different email
        </button>
      </div>
    </div>
  );
}
