import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/supabase/env";
import { functionLabel, trackShort } from "@/lib/domain/careers";
import { sendEmail } from "./send";
import { answerEmail, newCommentEmail, editRequestEmail } from "./templates";

// Who hears about a new comment (docs/BUILD_PLAN.md 4.7):
//  - the entry's author, about every comment by someone else under their entry;
//  - [decision] the person who asked, when the entry's author answers them.
//    The spec only mentions the first; without the second, an answer can sit
//    unseen and the "came back" measure undercounts.
// Each person's preference decides: instant (now), daily (the digest), off.
// Runs after the response (next/server `after`), with the service role,
// because it needs the author's email address, which no reader may see.

type Person = { id: string; email: string; notify_pref: string; deleted_at: string | null };

const PERSON = "id, email, notify_pref, deleted_at";

export const replyUrl = (commentId: string) => `${siteUrl()}/reply/${commentId}`;
export const prefsUrl = () => `${siteUrl()}/me#notifications`;

function displayName(p: { full_name: string | null; cohort: string | null }): string {
  return [p.full_name ?? "Someone", p.cohort].filter(Boolean).join(", ");
}

export async function notifyNewComment(commentId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: comment } = await admin
    .from("comments")
    .select("id, entry_type, entry_id, parent_id, author_id, body")
    .eq("id", commentId)
    .maybeSingle<{
      id: string;
      entry_type: string;
      entry_id: string;
      parent_id: string | null;
      author_id: string;
      body: string;
    }>();
  if (!comment) return;

  // The entry under which the comment was posted: its author, how it is shown, and its title.
  let review: { author_id: string; visibility: string } | null = null;
  let courseTitle = "";
  let noun = "review";
  if (comment.entry_type === "course_review") {
    const { data } = await admin
      .from("course_reviews")
      .select("id, author_id, visibility, offering:offerings!inner(course:courses!inner(title))")
      .eq("id", comment.entry_id)
      .maybeSingle<{
        id: string;
        author_id: string;
        visibility: string;
        offering: { course: { title: string } };
      }>();
    if (data) {
      review = data;
      courseTitle = data.offering.course.title;
    }
  } else if (comment.entry_type === "career_entry") {
    const { data } = await admin
      .from("career_entries")
      .select("id, type, author_id, visibility, track, company, from_function")
      .eq("id", comment.entry_id)
      .maybeSingle<{
        id: string;
        type: string;
        author_id: string;
        visibility: string;
        track: string | null;
        company: string | null;
        from_function: string | null;
      }>();
    if (data) {
      review = data;
      noun = data.type === "playbook" ? "playbook" : "company note";
      courseTitle =
        data.type === "playbook"
          ? `${functionLabel(data.from_function).split(" / ")[0]} → ${trackShort(data.track)}`
          : (data.company ?? "company");
    }
  }
  if (!review) return;

  const { data: commenter } = await admin
    .from("profiles")
    .select("full_name, cohort")
    .eq("id", comment.author_id)
    .maybeSingle<{ full_name: string | null; cohort: string | null }>();

  // 1. Tell the entry's author.
  if (comment.author_id !== review.author_id) {
    const { data: owner } = await admin
      .from("profiles")
      .select(PERSON)
      .eq("id", review.author_id)
      .maybeSingle<Person>();
    if (owner && !owner.deleted_at && owner.notify_pref === "instant") {
      await sendEmail({
        to: owner.email,
        userId: owner.id,
        kind: "comment_alert",
        refId: comment.id,
        email: newCommentEmail({
          courseTitle,
          noun,
          commenter: commenter ? displayName(commenter) : "Someone",
          body: comment.body,
          isQuestion: comment.parent_id === null,
          replyUrl: replyUrl(comment.parent_id ?? comment.id),
          prefsUrl: prefsUrl(),
        }),
      });
    }
  }

  // 2. The entry's author answered: tell whoever asked.
  if (comment.parent_id && comment.author_id === review.author_id) {
    const { data: question } = await admin
      .from("comments")
      .select("id, author_id, body")
      .eq("id", comment.parent_id)
      .maybeSingle<{ id: string; author_id: string; body: string }>();
    if (!question || question.author_id === review.author_id) return;
    const { data: asker } = await admin
      .from("profiles")
      .select(PERSON)
      .eq("id", question.author_id)
      .maybeSingle<Person>();
    if (!asker || asker.deleted_at || asker.notify_pref !== "instant") return;
    await sendEmail({
      to: asker.email,
      userId: asker.id,
      kind: "answer_alert",
      refId: comment.id,
      email: answerEmail({
        courseTitle,
        // Never name the author of an anonymous review.
        answerer:
          review.visibility === "anonymous" || !commenter ? "The author" : displayName(commenter),
        question: question.body,
        answer: comment.body,
        threadUrl: replyUrl(question.id),
        prefsUrl: prefsUrl(),
      }),
    });
  }
}

/** A moderator asked an author to edit a flagged review. Sent whatever their preference. */
export async function sendEditRequest(reviewId: string, reasons: string[]): Promise<void> {
  const admin = createAdminClient();
  const { data: review } = await admin
    .from("course_reviews")
    .select("id, author_id, offering:offerings!inner(course:courses!inner(title))")
    .eq("id", reviewId)
    .maybeSingle<{ id: string; author_id: string; offering: { course: { title: string } } }>();
  if (!review) return;
  const { data: owner } = await admin
    .from("profiles")
    .select(PERSON)
    .eq("id", review.author_id)
    .maybeSingle<Person>();
  if (!owner || owner.deleted_at) return;
  await sendEmail({
    to: owner.email,
    userId: owner.id,
    kind: "edit_request",
    refId: null,
    email: editRequestEmail({
      courseTitle: review.offering.course.title,
      reasons,
      editUrl: `${siteUrl()}/write/course-review?review=${review.id}`,
      rulesUrl: `${siteUrl()}/rules`,
    }),
  });
}
