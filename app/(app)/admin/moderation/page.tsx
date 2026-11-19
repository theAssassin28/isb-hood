import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActionButton } from "@/components/action-button";
import { card, dangerButton, notice, pageColumn, secondaryButton } from "@/components/styles";
import { requireModerator } from "@/lib/auth/session";
import { FLAG_LATE_HOURS } from "@/lib/domain/flags";
import { createClient } from "@/lib/supabase/server";
import { resolveFlags } from "./actions";

export const metadata: Metadata = { title: "Flags · ISB Hood admin" };

type Flag = {
  target_type: "course_review" | "career_entry" | "comment";
  target_id: string;
  reason: string;
  auto: boolean;
  created_at: string;
};

type Person = { full_name: string | null; cohort: string | null; email: string } | null;

type FlaggedReview = {
  id: string;
  status: string;
  visibility: string;
  outline_gap: string | null;
  learning_value_reason: string | null;
  grade_risk_reason: string | null;
  who_should_take: string | null;
  who_should_skip: string | null;
  author: Person;
  offering: {
    professor: string;
    term_label: string;
    cohort_year: string;
    course: { id: string; title: string };
  };
};

type FlaggedComment = {
  id: string;
  status: string;
  body: string;
  entry_id: string;
  author: Person;
};

const small = `${secondaryButton} min-h-11 px-3 text-sm`;

export default function ModerationPage() {
  return (
    <main className={pageColumn}>
      <h1 className="type-title">Flags</h1>
      <p className="mt-2 text-foreground/80">
        Oldest first. The promise is 24 hours. Flagged items stay visible until you remove them.
        Review the course, not the person:{" "}
        <Link href="/rules" className="text-brand underline underline-offset-4">
          content rules
        </Link>
        .
      </p>
      <div className="mt-6">
        <Suspense fallback={<p className="text-muted-foreground">Loading the queue…</p>}>
          <Queue />
        </Suspense>
      </div>
    </main>
  );
}

async function loadQueue() {
  const supabase = await createClient();
  const { data: flags, error } = await supabase
    .from("flags")
    .select("target_type, target_id, reason, auto, created_at")
    .is("resolved_at", null)
    .order("created_at")
    .returns<Flag[]>();
  if (error) return null;

  // One card per flagged item, however many people flagged it.
  const items = new Map<string, { type: Flag["target_type"]; id: string; flags: Flag[] }>();
  for (const flag of flags) {
    const key = `${flag.target_type}:${flag.target_id}`;
    const item = items.get(key) ?? { type: flag.target_type, id: flag.target_id, flags: [] };
    item.flags.push(flag);
    items.set(key, item);
  }
  const reviewIds = [...items.values()].filter((i) => i.type === "course_review").map((i) => i.id);
  const commentIds = [...items.values()].filter((i) => i.type === "comment").map((i) => i.id);

  const [reviewsResult, commentsResult] = await Promise.all([
    reviewIds.length
      ? supabase
          .from("course_reviews")
          .select(
            "id, status, visibility, outline_gap, learning_value_reason, grade_risk_reason, who_should_take, who_should_skip, " +
              "author:profiles(full_name, cohort, email), " +
              "offering:offerings(professor, term_label, cohort_year, course:courses(id, title))",
          )
          .in("id", reviewIds)
          .returns<FlaggedReview[]>()
      : Promise.resolve({ data: [] as FlaggedReview[] }),
    commentIds.length
      ? supabase
          .from("comments")
          .select("id, status, body, entry_id, author:profiles(full_name, cohort, email)")
          .in("id", commentIds)
          .returns<FlaggedComment[]>()
      : Promise.resolve({ data: [] as FlaggedComment[] }),
  ]);
  const reviews = new Map((reviewsResult.data ?? []).map((r) => [r.id, r]));
  const comments = new Map((commentsResult.data ?? []).map((c) => [c.id, c]));

  // Which course each flagged comment sits under, for "see in context".
  const parentIds = [...new Set([...comments.values()].map((c) => c.entry_id))];
  const { data: parents } = parentIds.length
    ? await supabase
        .from("course_reviews")
        .select("id, offering:offerings(course:courses(id))")
        .in("id", parentIds)
        .returns<{ id: string; offering: { course: { id: string } } }[]>()
    : { data: [] };
  const courseOf = new Map((parents ?? []).map((p) => [p.id, p.offering.course.id]));

  const now = Date.now();
  return [...items.values()].map((item) => ({
    ...item,
    hours: Math.floor((now - new Date(item.flags[0].created_at).getTime()) / 3_600_000),
    review: item.type === "course_review" ? reviews.get(item.id) : undefined,
    comment: item.type === "comment" ? comments.get(item.id) : undefined,
    commentCourseId:
      item.type === "comment" ? courseOf.get(comments.get(item.id)?.entry_id ?? "") : undefined,
  }));
}

async function Queue() {
  await requireModerator();
  const queue = await loadQueue();
  if (!queue) {
    return (
      <p role="alert" className={notice}>
        The queue could not be loaded. Reload to try again.
      </p>
    );
  }
  if (queue.length === 0) return <p className={notice}>Nothing flagged. Well done.</p>;

  return (
    <ul className="space-y-4">
      {queue.map((item) => {
        const { hours, review, comment } = item;
        const late = hours >= FLAG_LATE_HOURS;
        const reasons = [...new Set(item.flags.map((f) => f.reason))];
        const author = review?.author ?? comment?.author ?? null;
        const contextHref = review
          ? `/courses/${review.offering.course.id}#review-${review.id}`
          : comment && item.commentCourseId
            ? `/courses/${item.commentCourseId}#review-${comment.entry_id}`
            : null;

        return (
          <li key={`${item.type}:${item.id}`} className={card}>
            <p className="flex flex-wrap items-center gap-x-2 text-sm">
              <span className="font-semibold text-foreground">
                {item.type === "course_review"
                  ? "Review"
                  : item.type === "comment"
                    ? "Comment"
                    : "Career entry"}
              </span>
              <span className={late ? "font-semibold text-destructive" : "text-muted-foreground"}>
                waiting {hours} h{late ? " · nearly overdue" : ""}
              </span>
              <span className="text-muted-foreground">
                · flagged by {item.flags.length}
                {item.flags.some((f) => f.auto) ? " (incl. automatic check)" : ""}
              </span>
            </p>

            <ul className="mt-2 list-disc pl-5 text-sm text-foreground">
              {reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>

            {review ? (
              <div className="mt-3 rounded-md border border-border bg-background p-3 text-sm">
                <p className="font-medium">
                  {review.offering.course.title} · {review.offering.professor},{" "}
                  {review.offering.term_label} {review.offering.cohort_year}
                </p>
                {[
                  review.outline_gap,
                  review.learning_value_reason,
                  review.grade_risk_reason,
                  review.who_should_take,
                  review.who_should_skip,
                ]
                  .filter((t): t is string => Boolean(t && t.trim()))
                  .map((text, i) => (
                    <p key={i} className="mt-1 break-words whitespace-pre-line">
                      {text}
                    </p>
                  ))}
              </div>
            ) : null}
            {comment ? (
              <p className="mt-3 rounded-md border border-border bg-background p-3 text-sm break-words whitespace-pre-line">
                {comment.body}
              </p>
            ) : null}
            {!review && !comment ? (
              <p className="mt-3 text-sm text-muted-foreground">
                The item was deleted by its author.
              </p>
            ) : null}

            {author ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Written by {author.full_name ?? "unknown"}
                {author.cohort ? `, ${author.cohort}` : ""} ({author.email})
                {review?.visibility === "anonymous" ? " · shown to readers as anonymous" : ""}
              </p>
            ) : null}
            {(review?.status ?? comment?.status) === "removed" ? (
              <p className="mt-1 text-sm font-medium text-destructive">Already removed.</p>
            ) : null}
            {contextHref ? (
              <Link
                href={contextHref}
                className="mt-1 inline-flex min-h-11 items-center text-sm text-brand underline underline-offset-4"
              >
                See it on the page
              </Link>
            ) : null}

            <div className="mt-2 flex flex-wrap gap-2">
              <ActionButton
                action={resolveFlags.bind(null, item.type, item.id, "kept")}
                className={small}
              >
                Keep
              </ActionButton>
              {item.type === "course_review" ? (
                <ActionButton
                  action={resolveFlags.bind(null, item.type, item.id, "edit_requested")}
                  className={small}
                  confirmText="Email the author asking them to edit this review?"
                >
                  Ask author to edit
                </ActionButton>
              ) : null}
              <ActionButton
                action={resolveFlags.bind(null, item.type, item.id, "removed")}
                className={`${dangerButton} px-3 text-sm`}
                confirmText="Remove this from the site? The author is not told automatically."
              >
                Remove
              </ActionButton>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
