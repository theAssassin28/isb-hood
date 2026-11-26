"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { deleteComment, postComment, type CommentState } from "@/app/(app)/courses/comment-actions";
import type { PublicComment, Thread } from "@/lib/domain/threads";
import { ActionButton } from "./action-button";
import { FlagButton } from "./flag-button";
import { fieldInput, primaryButtonInline, secondaryButton } from "./styles";

// Questions and answers under one review or career entry (docs/BUILD_PLAN.md 4.7).

type EntryType = "course_review" | "career_entry";

const formatDay = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));

export function ReviewThread({
  entryType = "course_review",
  entryId,
  threads,
  openToQuestions,
  isMyEntry,
  openThreadId,
}: {
  entryType?: EntryType;
  entryId: string;
  threads: Thread[];
  openToQuestions: boolean;
  isMyEntry: boolean;
  /** Thread to open and scroll to, from an email link. */
  openThreadId: string | null;
}) {
  const waiting = threads.filter(
    (t) => t.question.first_reply_at === null && !t.question.is_entry_author,
  ).length;
  const containsOpen = threads.some((t) => t.question.id === openThreadId);
  const count = threads.length;

  // One name per role, whatever the count, so the control is recognisable on
  // every review: readers "Ask the author", the author "Questions from readers".
  const counted = count === 0 ? "" : ` · ${count} question${count === 1 ? "" : "s"}`;
  const summary = isMyEntry
    ? `Questions from readers${counted}` + (waiting > 0 ? ` · ${waiting} waiting for you` : "")
    : openToQuestions
      ? `Ask the author${counted}`
      : `Questions${counted}`;

  return (
    <details
      className="mt-4 rounded-md border border-border"
      open={containsOpen || (isMyEntry && waiting > 0)}
    >
      <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium text-brand">
        {summary}
      </summary>
      <div className="space-y-4 px-3 pb-3">
        {threads.map((thread) => (
          <ThreadView
            key={thread.question.id}
            entryType={entryType}
            entryId={entryId}
            thread={thread}
            isMyEntry={isMyEntry}
            focus={thread.question.id === openThreadId}
          />
        ))}

        {isMyEntry ? (
          count === 0 ? (
            <p className="text-sm text-muted-foreground">
              When readers ask you something, it appears here and we email you.
            </p>
          ) : null
        ) : openToQuestions ? (
          <CommentForm
            entryType={entryType}
            entryId={entryId}
            parentId={null}
            label="Ask the author"
            hint="Public: your name and cohort show with your question. The author gets an email."
            submit="Ask"
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            The author is not taking new questions on this{" "}
            {entryType === "career_entry" ? "entry" : "review"}.
          </p>
        )}
      </div>
    </details>
  );
}

function ThreadView({
  entryType,
  entryId,
  thread,
  isMyEntry,
  focus,
}: {
  entryType: EntryType;
  entryId: string;
  thread: Thread;
  isMyEntry: boolean;
  focus: boolean;
}) {
  const [replying, setReplying] = useState(focus);
  const anchor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focus) anchor.current?.scrollIntoView({ block: "center" });
  }, [focus]);
  const { question, replies } = thread;
  const waitingForMe = isMyEntry && question.first_reply_at === null && !question.is_entry_author;

  return (
    <div
      ref={anchor}
      id={`thread-${question.id}`}
      className={`scroll-mt-4 rounded-md ${waitingForMe ? "border border-warn p-2" : ""}`}
    >
      {waitingForMe ? (
        <p className="mb-1 text-sm font-semibold text-foreground">Waiting for your answer</p>
      ) : null}
      <CommentView comment={question} />
      {replies.length > 0 ? (
        <ul className="mt-2 space-y-2 border-l-2 border-border pl-3">
          {replies.map((reply) => (
            <li key={reply.id}>
              <CommentView comment={reply} />
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-1 pl-3">
        {replying ? (
          <CommentForm
            entryType={entryType}
            entryId={entryId}
            parentId={question.id}
            label={isMyEntry ? "Your answer" : "Your reply"}
            hint={isMyEntry ? "Your answer is public and helps the next reader too." : undefined}
            submit={isMyEntry ? "Post answer" : "Reply"}
            autoFocus={focus || replying}
            onCancel={() => setReplying(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setReplying(true)}
            className="inline-flex min-h-11 items-center text-sm font-medium text-brand underline underline-offset-4"
          >
            {waitingForMe ? "Answer" : "Reply"}
          </button>
        )}
      </div>
    </div>
  );
}

function CommentView({ comment }: { comment: PublicComment }) {
  return (
    <div>
      <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{comment.author_display}</span>
        {comment.is_entry_author && comment.author_display !== "Author" ? (
          <span className="type-tag">Author</span>
        ) : null}
        {comment.is_entry_author && comment.author_display === "Author" ? (
          <span className="sr-only">(the entry’s author)</span>
        ) : null}
        <span>{formatDay(comment.created_at)}</span>
      </p>
      <p className="mt-0.5 text-sm break-words whitespace-pre-line text-foreground">
        {comment.body}
      </p>
      <div className="flex flex-wrap items-center gap-x-3">
        {comment.is_mine ? (
          <ActionButton
            action={deleteComment.bind(null, comment.id)}
            confirmText="Delete your comment?"
            className="inline-flex min-h-11 items-center px-1 text-sm text-muted-foreground underline underline-offset-4"
            pendingLabel="Deleting…"
          >
            Delete
          </ActionButton>
        ) : (
          <FlagButton targetType="comment" targetId={comment.id} />
        )}
      </div>
    </div>
  );
}

const initial: CommentState = { status: "idle", message: null, sentAt: 0 };

function CommentForm({
  entryType,
  entryId,
  parentId,
  label,
  hint,
  submit,
  autoFocus,
  onCancel,
}: {
  entryType: EntryType;
  entryId: string;
  parentId: string | null;
  label: string;
  hint?: string;
  submit: string;
  autoFocus?: boolean;
  onCancel?: () => void;
}) {
  const [state, formAction, pending] = useActionState(postComment, initial);
  // Controlled, so an error or the pay-figure warning never wipes what was typed
  // (React resets a form after its action runs). Cleared only after a post.
  const [body, setBody] = useState("");
  const [lastSent, setLastSent] = useState(0);
  if (state.sentAt !== lastSent) {
    setLastSent(state.sentAt);
    setBody("");
  }
  const id = `comment-${parentId ?? entryId}`;
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (autoFocus) textarea.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="entry_type" value={entryType} />
      <input type="hidden" name="entry_id" value={entryId} />
      {parentId ? <input type="hidden" name="parent_id" value={parentId} /> : null}
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      <textarea
        ref={textarea}
        id={id}
        name="body"
        rows={3}
        maxLength={2000}
        required
        value={body}
        onChange={(event) => setBody(event.target.value)}
        className={`${fieldInput} py-2.5`}
      />
      {state.status === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
      {state.status === "confirm" ? (
        <div
          role="alert"
          className="rounded-md border border-warn bg-background p-3 text-sm text-foreground"
        >
          <p>{state.message}</p>
          <button
            type="submit"
            name="confirm_pay"
            value="1"
            disabled={pending}
            className={`${secondaryButton} mt-2`}
          >
            Post anyway
          </button>
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className={`${primaryButtonInline} px-5`}>
          {pending ? "Posting…" : submit}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 px-2 text-sm text-muted-foreground"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
