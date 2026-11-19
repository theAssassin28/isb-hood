import "server-only";
import { buildDigests, type DigestComment, type DigestReview } from "@/lib/email/digest";
import { prefsUrl, replyUrl } from "@/lib/email/notify";
import { sendEmail } from "@/lib/email/send";
import { digestEmail, moderatorQueueEmail, surveyEmail } from "@/lib/email/templates";
import { todayInIndia } from "@/lib/domain/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/supabase/env";

// The one daily job (Vercel Hobby allows one run a day, docs/BUILD_PLAN.md 2).
// It sends the daily digests and the moderator reminder; touching the database
// also keeps the free Supabase project from pausing.
// It also sends survey invitations and their single reminder.

const DAY_MS = 24 * 3_600_000;

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  cohort: string | null;
  notify_pref: string;
  role: string;
  deleted_at: string | null;
};

export async function runDaily(now: Date): Promise<Record<string, number>> {
  const admin = createAdminClient();
  const dayAgo = new Date(now.getTime() - DAY_MS).toISOString();

  // ------------------------------------------------------------- digests
  const { data: comments } = await admin
    .from("comments")
    .select("id, entry_id, parent_id, author_id, body, created_at")
    .eq("entry_type", "course_review")
    .eq("status", "live")
    .gte("created_at", dayAgo)
    .returns<DigestComment[]>();

  let digestsSent = 0;
  if (comments && comments.length > 0) {
    const reviewIds = [...new Set(comments.map((c) => c.entry_id))];
    const parentIds = [
      ...new Set(comments.map((c) => c.parent_id).filter((p): p is string => !!p)),
    ];
    const [{ data: reviewRows }, { data: parentRows }] = await Promise.all([
      admin
        .from("course_reviews")
        .select(
          "id, author_id, visibility, status, offering:offerings!inner(course:courses!inner(title))",
        )
        .in("id", reviewIds)
        .returns<
          {
            id: string;
            author_id: string;
            visibility: string;
            status: string;
            offering: { course: { title: string } };
          }[]
        >(),
      parentIds.length
        ? admin
            .from("comments")
            .select("id, author_id")
            .in("id", parentIds)
            .returns<{ id: string; author_id: string }[]>()
        : Promise.resolve({ data: [] as { id: string; author_id: string }[] }),
    ]);

    const reviews = new Map<string, DigestReview>(
      (reviewRows ?? [])
        .filter((r) => r.status === "live")
        .map((r) => [
          r.id,
          {
            author_id: r.author_id,
            visibility: r.visibility,
            course_title: r.offering.course.title,
          },
        ]),
    );
    const askers = new Map((parentRows ?? []).map((p) => [p.id, p.author_id]));

    const people = [
      ...new Set([
        ...comments.map((c) => c.author_id),
        ...[...reviews.values()].map((r) => r.author_id),
        ...askers.values(),
      ]),
    ];
    const { data: profileRows } = await admin
      .from("profiles")
      .select("id, email, full_name, cohort, notify_pref, role, deleted_at")
      .in("id", people)
      .returns<Profile[]>();
    const profiles = new Map((profileRows ?? []).map((p) => [p.id, p]));
    const names = new Map(
      (profileRows ?? []).map((p) => [
        p.id,
        [p.full_name ?? "Someone", p.cohort].filter(Boolean).join(", "),
      ]),
    );

    const digests = buildDigests({ comments, reviews, askers, names, url: replyUrl });
    for (const [userId, items] of digests) {
      const person = profiles.get(userId);
      if (!person || person.deleted_at || person.notify_pref !== "daily") continue;

      // Only what is new since this person's last digest.
      const { data: last } = await admin
        .from("email_log")
        .select("sent_at")
        .eq("user_id", userId)
        .eq("kind", "digest")
        .order("sent_at", { ascending: false })
        .limit(1)
        .returns<{ sent_at: string }[]>();
      const since = last?.[0]?.sent_at ?? dayAgo;
      const fresh = items.filter((i) => i.created_at > since);
      if (fresh.length === 0) continue;

      const result = await sendEmail({
        to: person.email,
        userId,
        kind: "digest",
        refId: null,
        email: digestEmail({ items: fresh, prefsUrl: prefsUrl() }),
      });
      if (result.ok) digestsSent += 1;
    }
  }

  // ------------------------------------------------- moderator reminder
  const { data: openFlags } = await admin
    .from("flags")
    .select("target_type, target_id, created_at")
    .is("resolved_at", null)
    .order("created_at")
    .returns<{ target_type: string; target_id: string; created_at: string }[]>();
  const openItems = new Set((openFlags ?? []).map((f) => `${f.target_type}:${f.target_id}`)).size;

  let moderatorsEmailed = 0;
  if (openFlags && openFlags.length > 0) {
    const oldestHours = Math.floor(
      (now.getTime() - new Date(openFlags[0].created_at).getTime()) / 3_600_000,
    );
    const { data: moderators } = await admin
      .from("profiles")
      .select("id, email, deleted_at")
      .eq("role", "moderator")
      .is("deleted_at", null)
      .returns<{ id: string; email: string }[]>();
    for (const moderator of moderators ?? []) {
      const result = await sendEmail({
        to: moderator.email,
        userId: moderator.id,
        kind: "moderator_reminder",
        refId: null,
        email: moderatorQueueEmail({
          openItems,
          oldestHours,
          queueUrl: `${siteUrl()}/admin/moderation`,
        }),
      });
      if (result.ok) moderatorsEmailed += 1;
    }
  }

  // ------------------------------------------------------- survey emails
  // One invitation when a survey becomes due, one reminder three days later,
  // then nothing (plan 4.9). Who is due is decided by survey_due() in SQL,
  // the same rule as the in-app prompt.
  const surveyCounts = { survey_invites: 0, survey_reminders: 0 };
  const today = todayInIndia(now);
  const reminderAfter = new Date(now.getTime() - 3 * DAY_MS).toISOString();
  for (const survey of ["post_bid", "career_followup"] as const) {
    const { data: due, error: dueError } = await admin.rpc("survey_due_users", {
      p_survey: survey,
      p_today: today,
    });
    if (dueError || !Array.isArray(due) || due.length === 0) continue;
    const ids = (due as { user_id: string }[]).map((d) => d.user_id);
    const [{ data: people }, { data: sent }] = await Promise.all([
      admin
        .from("profiles")
        .select("id, email, notify_pref")
        .in("id", ids)
        .returns<{ id: string; email: string; notify_pref: string }[]>(),
      admin
        .from("email_log")
        .select("user_id, kind, sent_at")
        .in("user_id", ids)
        .in("kind", [`survey_${survey}`, `survey_${survey}_reminder`])
        .returns<{ user_id: string; kind: string; sent_at: string }[]>(),
    ]);
    for (const person of people ?? []) {
      if (person.notify_pref === "off") continue;
      const mine = (sent ?? []).filter((e) => e.user_id === person.id);
      const invite = mine.find((e) => e.kind === `survey_${survey}`);
      const reminded = mine.some((e) => e.kind === `survey_${survey}_reminder`);
      if (invite && (reminded || invite.sent_at > reminderAfter)) continue;
      const reminder = Boolean(invite);
      const result = await sendEmail({
        to: person.email,
        userId: person.id,
        kind: reminder ? `survey_${survey}_reminder` : `survey_${survey}`,
        refId: null,
        email: surveyEmail({
          survey,
          reminder,
          url: `${siteUrl()}/survey/${survey === "post_bid" ? "post-bid" : "career"}`,
          prefsUrl: prefsUrl(),
        }),
      });
      if (result.ok) surveyCounts[reminder ? "survey_reminders" : "survey_invites"] += 1;
    }
  }

  return {
    ...surveyCounts,
    comments_last_24h: comments?.length ?? 0,
    digests_sent: digestsSent,
    open_flagged_items: openItems,
    moderators_emailed: moderatorsEmailed,
  };
}
