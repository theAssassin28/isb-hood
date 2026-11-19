"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { safeCourseId } from "@/lib/auth/access";
import { requireReader } from "@/lib/auth/session";
import { notifyNewComment } from "@/lib/email/notify";
import { track, trackOnceForOther } from "@/lib/domain/events";
import { flagText } from "@/lib/domain/flags";
import { mentionsPayFigures, PAY_FIGURE_WARNING } from "@/lib/domain/payFigures";
import { hoursToAnswer } from "@/lib/domain/threads";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const uuid = safeCourseId;

/** Comments one person may post in an hour; stops a runaway loop flooding inboxes. */
const HOURLY_LIMIT = 20;
const MAX_CHARS = 2000;

export type CommentState = {
  status: "idle" | "sent" | "error" | "confirm";
  message: string | null;
  /** Changes on every successful post, so the form can clear itself. */
  sentAt: number;
};

export async function postComment(
  previous: CommentState,
  formData: FormData,
): Promise<CommentState> {
  const { profile } = await requireReader();
  const fail = (message: string): CommentState => ({ ...previous, status: "error", message });

  const entryId = uuid(formData.get("entry_id"));
  const parentRaw = formData.get("parent_id");
  const parentId = parentRaw ? uuid(parentRaw) : null;
  const body = String(formData.get("body") ?? "").trim();
  const confirmed = formData.get("confirm_pay") === "1";

  if (!entryId || (parentRaw && !parentId)) return fail("Reload the page and try again.");
  if (body === "") return fail("Write something first.");
  if (body.length > MAX_CHARS) return fail(`Keep it under ${MAX_CHARS} characters.`);

  const payFigures = mentionsPayFigures(body);
  if (payFigures && !confirmed) {
    return { ...previous, status: "confirm", message: PAY_FIGURE_WARNING };
  }

  const supabase = await createClient();
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("author_id", profile.id)
    .gte("created_at", hourAgo);
  if ((count ?? 0) >= HOURLY_LIMIT) {
    return fail("You have posted a lot in the last hour. Try again a little later.");
  }

  const { data: review } = await supabase
    .from("course_reviews_public")
    .select("id, is_mine")
    .eq("id", entryId)
    .maybeSingle<{ id: string; is_mine: boolean }>();
  if (!review) return fail("This review is no longer available.");

  let question: { created_at: string; first_reply_at: string | null; is_mine: boolean } | null =
    null;
  if (parentId) {
    const { data } = await supabase
      .from("comments_public")
      .select("created_at, first_reply_at, is_mine")
      .eq("id", parentId)
      .maybeSingle<{ created_at: string; first_reply_at: string | null; is_mine: boolean }>();
    if (!data) return fail("That question is no longer available.");
    question = data;
  }

  const { data: inserted, error } = await supabase
    .from("comments")
    .insert({
      entry_type: "course_review",
      entry_id: entryId,
      parent_id: parentId,
      author_id: profile.id,
      body,
    })
    .select("id, created_at")
    .single<{ id: string; created_at: string }>();
  if (error || !inserted) {
    // Row level security refuses comments the rules do not allow (plan 4.7).
    return fail(
      error?.code === "42501"
        ? "The author is not taking new questions on this review."
        : "Your comment was not posted. Check your connection and try again.",
    );
  }

  await track(profile.id, "comment_posted", {
    entry_type: "course_review",
    entry_id: entryId,
    is_question: parentId === null,
  });

  // The entry's author answering a question for the first time (plan 8.1).
  const firstAnswer =
    parentId !== null && review.is_mine && question !== null && question.first_reply_at === null;
  if (firstAnswer && question) {
    await track(profile.id, "comment_answered", {
      entry_id: entryId,
      question_id: parentId,
      hours_to_answer: hoursToAnswer(question.created_at, new Date(inserted.created_at)),
    });
  }

  const commentId = inserted.id;
  after(async () => {
    const admin = createAdminClient();
    if (firstAnswer && parentId) {
      // "Got the thing" for the person who asked (plan 6.4).
      const { data: asker } = await admin
        .from("comments")
        .select("author_id")
        .eq("id", parentId)
        .maybeSingle<{ author_id: string }>();
      if (asker && asker.author_id !== profile.id) {
        await trackOnceForOther(asker.author_id, {
          module: "courses",
          trigger: "author_reply_received",
          entry_id: entryId,
        });
      }
    }
    if (payFigures) {
      await admin.from("flags").insert({
        target_type: "comment",
        target_id: commentId,
        reporter_id: null,
        reason: "Possible pay or offer figure, posted after the warning",
        auto: true,
      });
    }
    await notifyNewComment(commentId);
  });

  refresh();
  return { status: "sent", message: null, sentAt: Date.now() };
}

export async function deleteComment(commentIdInput: string): Promise<{ error: string | null }> {
  await requireReader();
  const commentId = uuid(commentIdInput);
  if (!commentId) return { error: "Comment not found." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_comment", { target: commentId });
  if (error) return { error: "That comment could not be deleted. Try again." };
  refresh();
  return { error: null };
}

export type FlagState = { status: "idle" | "done" | "error"; message: string | null };

export async function flagContent(_previous: FlagState, formData: FormData): Promise<FlagState> {
  const { profile } = await requireReader();
  const targetType = formData.get("target_type");
  const targetId = uuid(formData.get("target_id"));
  const reason = flagText(String(formData.get("reason") ?? ""), String(formData.get("note") ?? ""));
  if ((targetType !== "course_review" && targetType !== "comment") || !targetId) {
    return { status: "error", message: "Reload the page and try again." };
  }
  if (!reason) return { status: "error", message: "Choose a reason." };

  const supabase = await createClient();
  const { error } = await supabase.from("flags").insert({
    target_type: targetType,
    target_id: targetId,
    reporter_id: profile.id,
    reason,
  });
  if (error && error.code !== "23505") {
    return { status: "error", message: "The flag was not sent. Try again." };
  }
  return {
    status: "done",
    message:
      error?.code === "23505"
        ? "You have already flagged this. A moderator will look at it."
        : "Thanks. A moderator will look at it within a day. It stays visible until then.",
  };
}
