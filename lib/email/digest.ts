// Who gets what in the daily digest (docs/BUILD_PLAN.md 4.7). Pure.

import type { DigestItem } from "./templates";

export type DigestComment = {
  id: string;
  entry_id: string;
  parent_id: string | null;
  author_id: string;
  body: string;
  created_at: string;
};

export type DigestReview = { author_id: string; visibility: string; course_title: string };

export type DatedItem = DigestItem & { created_at: string };

/**
 * For each person: comments by others under their reviews, and answers from a
 * review's author to questions they asked. Same rules as the instant emails,
 * so the two can never disagree about who hears what.
 */
export function buildDigests(args: {
  comments: DigestComment[];
  reviews: Map<string, DigestReview>;
  /** Question id -> who asked it. */
  askers: Map<string, string>;
  /** User id -> "Name, Co'XX". */
  names: Map<string, string>;
  url: (commentId: string) => string;
}): Map<string, DatedItem[]> {
  const out = new Map<string, DatedItem[]>();
  const add = (userId: string, item: DatedItem) =>
    out.set(userId, [...(out.get(userId) ?? []), item]);

  for (const c of [...args.comments].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const review = args.reviews.get(c.entry_id);
    if (!review) continue;
    const thread = c.parent_id ?? c.id;

    if (c.author_id !== review.author_id) {
      add(review.author_id, {
        kind: "comment",
        courseTitle: review.course_title,
        commenter: args.names.get(c.author_id) ?? "Someone",
        body: c.body,
        url: args.url(thread),
        created_at: c.created_at,
      });
    } else if (c.parent_id) {
      const asker = args.askers.get(c.parent_id);
      if (asker && asker !== review.author_id) {
        add(asker, {
          kind: "answer",
          courseTitle: review.course_title,
          answerer:
            review.visibility === "anonymous"
              ? "The author"
              : (args.names.get(c.author_id) ?? "The author"),
          body: c.body,
          url: args.url(thread),
          created_at: c.created_at,
        });
      }
    }
  }
  return out;
}
