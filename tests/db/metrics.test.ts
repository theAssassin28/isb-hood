import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { asUser, createUser, freshDatabase, insertReview } from "./harness";

// The M5 "done when": with seeded data, every number on the metrics page
// matches a hand count. Each expected value below is counted by hand from the
// seed, with the reasoning next to it.

let db: PGlite;
let moderator: string;
let snapshot: Record<string, unknown>;

async function offering(code: string, term: string): Promise<{ course: string; offering: string }> {
  const { rows } = await db.query<{ course: string; offering: string }>(
    `with c as (insert into public.courses (code, title) values ($1, $1) returning id)
     insert into public.offerings (course_id, professor, term_label, cohort_year, is_current)
     select id, 'Prof ' || $1, $2, 'Co''27', true from c
     returning course_id as course, id as offering`,
    [code, term],
  );
  return rows[0];
}

const event = (user: string, name: string, props: Record<string, unknown> = {}, hoursAgo = 0) =>
  db.query(
    `insert into public.events (user_id, name, props, created_at)
     values ($1, $2, $3::jsonb, now() - make_interval(hours => $4::int))`,
    [user, name, JSON.stringify(props), hoursAgo],
  );

async function question(
  author: string,
  entryId: string,
  createdHoursAgo: number,
  answeredAfterHours: number | null,
) {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.comments (entry_type, entry_id, author_id, body, created_at, first_reply_at)
     values ('course_review', $1, $2, 'A question', now() - make_interval(hours => $3::int),
             case when $4::int is null then null
                  else now() - make_interval(hours => $3::int) + make_interval(hours => $4::int) end)
     returning id`,
    [entryId, author, createdHoursAgo, answeredAfterHours],
  );
  return rows[0].id;
}

beforeAll(async () => {
  db = await freshDatabase();
  moderator = await createUser(db, {
    email: "mod@isb.edu",
    name: "Mod",
    cohort: "Co'27",
    role: "moderator",
  });
  const r1 = await createUser(db, { email: "r1@isb.edu", name: "Reader One", cohort: "Co'27" });
  const r2 = await createUser(db, { email: "r2@isb.edu", name: "Reader Two", cohort: "Co'27" });
  const y1 = await createUser(db, { email: "y1@isb.edu", name: "YL One", cohort: "YL 2026-28" });
  const w1 = await createUser(db, { email: "w1@isb.edu", name: "Writer One", cohort: "Co'27" });
  const w2 = await createUser(db, { email: "w2@isb.edu", name: "Writer Two", cohort: "Co'26" });
  const a1 = await createUser(db, {
    email: "a1@gmail.com",
    name: "Alum One",
    cohort: "Co'26",
    accountType: "contributor",
    verification: "verified",
  });
  const a2 = await createUser(db, {
    email: "a2@gmail.com",
    name: "Alum Two",
    cohort: "Co'25",
    accountType: "contributor",
  });
  await db.query("update public.profiles set programme = 'pgp_yl' where id = $1", [y1]);
  await db.query("update public.profiles set early_access_chat = true where id = $1", [r1]);

  // Courses: C1 and C2 are Term 7 (the bid term), C3 is Term 5.
  const c1 = await offering("C1", "Term 7");
  const c2 = await offering("C2", "Term 7");
  const c3 = await offering("C3", "Term 5");

  const review = (who: string, off: string, seconds: number, extra: Record<string, unknown> = {}) =>
    asUser(db, who, () =>
      insertReview(db, { offeringId: off, authorId: who }, { form_seconds: seconds, ...extra }),
    );
  const w1c1 = await review(w1, c1.offering, 300);
  const a1c1 = await review(a1, c1.offering, 200);
  await review(w2, c1.offering, 400);
  const w1c2 = await review(w1, c2.offering, 100);
  await review(a2, c3.offering, 0); // unverified: pending_verification
  await asUser(db, moderator, () =>
    insertReview(
      db,
      { offeringId: c2.offering, authorId: moderator },
      { on_behalf_of_name: "Senior", on_behalf_of_cohort: "Co'26" },
    ),
  );

  for (const u of [w1, a1, w2, a2, r1])
    await event(u, "form_started", { entry_type: "course_review" });
  for (const u of [w1, a1, w2, a2])
    await event(u, "entry_submitted", { entry_type: "course_review" });

  await event(r1, "user_signed_up", { programme: "pgp" });
  await event(r2, "user_signed_up", { programme: "pgp" });
  await event(y1, "user_signed_up", { programme: "pgp_yl" });
  await event(w1, "user_signed_up", { programme: "pgp" });
  await event(a1, "user_signed_up", { programme: "alum" });

  await event(r1, "value_reached", { module: "courses" });
  await event(y1, "value_reached", { module: "courses" });
  await event(r2, "value_reached", { module: "career" });
  await event(r1, "return_visit", { day: "2026-12-10" });
  await event(r1, "return_visit", { day: "2026-12-11" });
  await event(a1, "return_visit", { day: "2026-12-10" });

  // Questions: Q1 answered in 10 h with three replies; Q2 unanswered for 72 h;
  // Q3 asked just now; Q4 answered in 60 h.
  const q1 = await question(y1, w1c1.id, 20, 10);
  await question(r1, a1c1.id, 72, null);
  await question(r2, w1c2.id, 0, null);
  await question(y1, a1c1.id, 100, 60);
  for (const who of [w1, r1, w1]) {
    await db.query(
      `insert into public.comments (entry_type, entry_id, parent_id, author_id, body)
       values ('course_review', $1, $2, $3, 'reply')`,
      [w1c1.id, q1, who],
    );
  }

  for (const u of [r1, r2, y1]) await event(u, "course_page_viewed", { current_term: "Term 7" });
  await event(r2, "career_entry_viewed", {});
  await event(r1, "fake_door_clicked", { door: "request_chat", left_contact: false });
  await event(r1, "fake_door_clicked", { door: "request_chat", left_contact: true });
  await event(r2, "fake_door_clicked", { door: "find_people", left_contact: false });

  // Surveys, inserted directly (eligibility is tested elsewhere).
  await db.query(
    `insert into public.survey_responses (user_id, survey, bid_effect, changed_course_ids, seniors_asked_band) values
       ($1, 'post_bid', 'changed', array[$4::uuid], '0'),
       ($2, 'post_bid', 'confirmed', null, '1-2'),
       ($3, 'post_bid', 'did_not_use', null, '1-2')`,
    [r1, r2, y1, c1.course],
  );
  await db.query(
    `insert into public.survey_responses (user_id, survey, career_action, action_text)
     values ($1, 'career_followup', 'changed_prep', 'Started case prep earlier')`,
    [r2],
  );
  await db.query(
    `insert into public.career_entries (type, author_id, status, track, from_function)
     values ('playbook', $1, 'live', 'product', 'finance')`,
    [a1],
  );

  snapshot = await asUser(db, moderator, async () => {
    const res = await db.query<{ s: Record<string, unknown> }>(
      "select public.metrics_snapshot() as s",
    );
    return res.rows[0].s;
  });
}, 60_000);

describe("metrics_snapshot matches a hand count", () => {
  it("Test 1 supply", () => {
    expect(snapshot).toMatchObject({
      reviews_live: 4, // W1 C1, A1 C1, W2 C1, W1 C2
      reviews_pending: 1, // A2 is not verified yet
      reviews_concierge: 1, // the moderator's entry for a senior is kept apart
      contributors: 4, // W1, A1, W2, A2
      bid_term: "Term 7",
      bid_courses_total: 2, // C1, C2
      bid_courses_3plus: 1, // C1 has 3 live; C2 has W1 + concierge = 2
      median_form_seconds: 250, // median of 100, 200, 300, 400 (A2's 0 excluded)
      form_starters: 5, // R1 started and gave up
      form_submitters: 4,
    });
  });

  it("Test 1 outcome", () => {
    expect(snapshot).toMatchObject({
      pb_responses: 3,
      pb_changed: 1,
      pb_confirmed: 1,
      pb_no_effect: 0,
      pb_did_not_use: 1,
      pb_seniors: { "0": 1, "1-2": 2 },
    });
  });

  it("Test 2", () => {
    expect(snapshot).toMatchObject({
      career_entries: 1,
      playbooks: 1,
      company_notes: 0,
      tracks_covered: 1,
      cf_responses: 1,
      cf_named_action: 1,
    });
  });

  it("follow-up questions", () => {
    expect(snapshot).toMatchObject({
      questions_total: 4, // replies are not questions
      questions_due: 3, // Q3 is under 48 h old and unanswered: not yet counted against us
      questions_answered_48h: 1, // Q1 (10 h); Q4 took 60 h
      median_hours_to_answer: 35, // median of 10 and 60
    });
  });

  it("funnel and programmes", () => {
    expect(snapshot).toMatchObject({
      arrived: 5,
      readers_arrived: 4, // the alum is not a reader
      value_courses: 2,
      value_career: 1,
      value_any: 3,
      came_back: 2, // R1 twice counts once; A1
      readers_came_back: 1, // R1
      by_programme: {
        pgp: { arrived: 3, value_reached: 2, came_back: 1 },
        pgp_yl: { arrived: 1, value_reached: 1, came_back: 0 },
        alum: { arrived: 1, value_reached: 0, came_back: 1 },
      },
    });
  });

  it("PGP YL, fake doors and outside contributors", () => {
    expect(snapshot).toMatchObject({
      yl_signups: 1,
      yl_questions: 1, // Q1 to a Co'27 writer; Q4 went to a Co'26 alum
      entry_readers: 3,
      chat_clickers: 1, // two clicks, one person
      chat_contacts: 1,
      threads_long: 1, // Q1 has three replies
      career_readers: 1,
      people_clickers: 1,
      people_contacts: 0,
      outside_contributors_published: 2, // A1 live, A2 pending
    });
  });

  it("is for moderators only", async () => {
    const someone = await createUser(db, { email: "x@isb.edu", name: "X", cohort: "Co'27" });
    await expect(
      asUser(db, someone, () => db.query("select public.metrics_snapshot()")),
    ).rejects.toThrow(/Only moderators/);
  });
});
