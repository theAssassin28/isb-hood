import "server-only";
import { DEFAULT_SETTINGS } from "@/lib/domain/settings";
import {
  BACKGROUND,
  COMMENTS,
  COURSES,
  FLAGS,
  id,
  OUTREACH,
  P,
  PEOPLE,
  REVIEWS,
} from "./seed-data";

// An in-memory stand-in for the ISB Hood database, used by the clickable demo
// (no Supabase). It mirrors the parts of supabase/migrations that the screens
// depend on: the public views (anonymity), who may see which rows, entry
// status on publish, uniqueness rules, and the database functions. Changes
// last until the server restarts or someone presses "Reset demo data".

export type Row = Record<string, unknown>;
export type TableName =
  | "profiles"
  | "courses"
  | "offerings"
  | "course_reviews"
  | "career_entries"
  | "career_entry_courses"
  | "comments"
  | "flags"
  | "survey_responses"
  | "events"
  | "outreach_contacts"
  | "app_settings"
  | "email_log";

export type Db = Record<TableName, Row[]> & { seq: number };
export type DbError = { message: string; code: string };

const KEY = "__isbHoodDemoDb";
const g = globalThis as unknown as Record<string, Db | undefined>;

export function db(): Db {
  if (!g[KEY]) g[KEY] = seed();
  return g[KEY]!;
}

export function resetDb(): void {
  g[KEY] = seed();
}

// ------------------------------------------------------------------ helpers
const now = () => new Date();
export const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86_400_000));
const hoursAgo = (n: number) => iso(new Date(Date.now() - n * 3_600_000));
export const istDate = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
const shiftDay = (day: string, n: number) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

export function newId(d: Db, kind = "9"): string {
  d.seq += 1;
  return id(kind, 0x100000 + d.seq);
}

const str = (v: unknown) => (typeof v === "string" ? v : null);

// ------------------------------------------------------------------ seeding
function seed(): Db {
  const d: Db = {
    profiles: [],
    courses: [],
    offerings: [],
    course_reviews: [],
    career_entries: [],
    career_entry_courses: [],
    comments: [],
    flags: [],
    survey_responses: [],
    events: [],
    outreach_contacts: [],
    app_settings: [],
    email_log: [],
    seq: 0,
  };
  const event = (user: string, name: string, props: Row, at: string) =>
    d.events.push({
      id: d.events.length + 1,
      user_id: user,
      name,
      props,
      session_id: null,
      created_at: at,
    });

  // Settings: bidding happened last week and the post-bid survey is open now,
  // so the survey prompt can be shown in the demo.
  const today = istDate(now());
  const settings = {
    ...DEFAULT_SETTINGS,
    yl_read_open: true,
    bid_window: { start: shiftDay(today, -8), end: shiftDay(today, -2) },
    post_bid_survey_window: { start: shiftDay(today, -1), end: shiftDay(today, 6) },
    career_followup_deadline: shiftDay(today, 30),
  };
  for (const [key, value] of Object.entries(settings)) {
    d.app_settings.push({ key, value, updated_by: null, updated_at: daysAgo(30) });
  }

  for (const p of PEOPLE) {
    d.profiles.push({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      programme: p.programme,
      cohort: p.cohort,
      background_function: p.background_function,
      background_industry: p.background_industry,
      years_experience_band: p.years_experience_band,
      target_track: p.target_track,
      role: p.role,
      account_type: p.account_type,
      verification_status: p.verification_status,
      verified_by: p.verification_status === "verified" ? P.nisha : null,
      verified_at: p.verification_status === "verified" ? daysAgo(17) : null,
      outreach_contact_id: null,
      source: p.source,
      notify_pref: "instant",
      early_access_chat: false,
      early_access_people: false,
      profile_completed_at: p.completedDaysAgo === null ? null : daysAgo(p.completedDaysAgo),
      created_at: daysAgo((p.completedDaysAgo ?? 0) + 1),
      deleted_at: null,
    });
    if (p.completedDaysAgo !== null) {
      event(
        p.id,
        "user_signed_up",
        {
          programme: p.programme,
          cohort: p.cohort,
          background: p.background_function,
          target_track: p.target_track,
          source: p.source,
        },
        daysAgo(p.completedDaysAgo),
      );
    }
  }

  const offeringId = new Map<string, string>();
  const courseOfOffering = new Map<string, string>();
  let o = 0;
  for (const c of COURSES) {
    d.courses.push({
      id: c.id,
      code: c.code,
      title: c.title,
      area: c.area,
      open_to_readers: true,
      created_at: daysAgo(40),
    });
    for (const off of c.offerings) {
      o += 1;
      const oid = id("b", o);
      offeringId.set(off.key, oid);
      courseOfOffering.set(oid, c.id);
      d.offerings.push({
        id: oid,
        course_id: c.id,
        professor: off.professor,
        term_label: off.term,
        cohort_year: off.cohort,
        is_current: off.current === true,
        status: "approved",
        created_by: null,
        created_at: daysAgo(40),
      });
    }
  }

  const reviewId = new Map<string, string>();
  REVIEWS.forEach((r, i) => {
    const rid = id("e", i + 1);
    reviewId.set(r.key, rid);
    const at = daysAgo(r.daysAgo);
    const status = r.status ?? "live";
    const [participation, quizzes, individual, group, midterm, final] = r.mix;
    d.course_reviews.push({
      id: rid,
      offering_id: offeringId.get(r.offering),
      author_id: r.author,
      visibility: r.anonymous ? "anonymous" : "named",
      open_to_questions: !r.closedToQuestions,
      status,
      on_behalf_of_name: r.onBehalfOf?.name ?? null,
      on_behalf_of_cohort: r.onBehalfOf?.cohort ?? null,
      why_taken: r.why,
      workload_band: r.workload,
      eval_participation: participation,
      eval_quizzes: quizzes,
      eval_individual: individual,
      eval_group: group,
      eval_midterm: midterm,
      eval_final: final,
      outline_gap: r.outlineGap,
      quant_qual: r.quantQual,
      teaching_styles: r.styles,
      grade_risk: r.risk,
      grade_risk_reason: r.riskWhy,
      learning_value: r.learning,
      learning_value_reason: r.learningWhy,
      careers_helped: r.careers.length ? r.careers : null,
      who_should_take: r.take ?? null,
      who_should_skip: r.skip ?? null,
      outline_match: r.outline,
      form_seconds: 200 + ((i * 37) % 180),
      created_at: at,
      updated_at: at,
      published_at: status === "live" ? at : null,
    });
    if (!r.onBehalfOf) {
      event(
        r.author,
        "form_started",
        {
          entry_type: "course_review",
          course_id: courseOfOffering.get(offeringId.get(r.offering)!) ?? null,
        },
        at,
      );
      event(
        r.author,
        "entry_submitted",
        {
          entry_type: "course_review",
          contributor_cohort: PEOPLE.find((p) => p.id === r.author)?.cohort ?? null,
          form_seconds: 200 + ((i * 37) % 180),
        },
        at,
      );
    }
  });

  const commentId = new Map<string, string>();
  COMMENTS.forEach((c, i) => {
    const cid = id("f", i + 1);
    commentId.set(c.key, cid);
    d.comments.push({
      id: cid,
      entry_type: "course_review",
      entry_id: reviewId.get(c.review),
      parent_id: c.replyTo ? commentId.get(c.replyTo) : null,
      author_id: c.author,
      body: c.body,
      status: "live",
      created_at: hoursAgo(c.hoursAgo),
      first_reply_at: null,
    });
  });
  // First author replies, as the database trigger would have stamped them.
  for (const c of d.comments) {
    if (!c.parent_id) continue;
    const review = d.course_reviews.find((r) => r.id === c.entry_id);
    const question = d.comments.find((q) => q.id === c.parent_id);
    if (review && question && review.author_id === c.author_id && !question.first_reply_at) {
      question.first_reply_at = c.created_at;
    }
  }

  FLAGS.forEach((f, i) => {
    d.flags.push({
      id: id("d", i + 1),
      target_type: f.target.comment ? "comment" : "course_review",
      target_id: f.target.comment
        ? commentId.get(f.target.comment)
        : reviewId.get(f.target.review!),
      reporter_id: f.reporter,
      reason: f.reason,
      auto: f.auto === true,
      resolved_by: null,
      resolved_at: null,
      resolution: null,
      created_at: hoursAgo(f.hoursAgo),
    });
  });

  const courseByCode = new Map(COURSES.map((c) => [c.code, c.id]));
  OUTREACH.forEach((c, i) => {
    const oid = id("0a", i + 1);
    d.outreach_contacts.push({
      id: oid,
      full_name: c.name,
      cohort: c.cohort,
      email: c.email ?? null,
      asked_course_ids: c.courses.map((code) => courseByCode.get(code)).filter(Boolean),
      campaign: c.campaign,
      claimed_by: c.claimedBy ?? null,
      created_at: daysAgo(25),
    });
    if (c.claimedBy) {
      const profile = d.profiles.find((p) => p.id === c.claimedBy);
      if (profile) profile.outreach_contact_id = oid;
    }
  });

  // Ravi viewed a Term 7 course page during bidding, so the post-bid survey is due for him.
  const pricing = COURSES[0].id;
  event(
    P.ravi,
    "course_page_viewed",
    { course_id: pricing, review_count: 3, has_new_or_changed_flag: true, current_term: "Term 7" },
    daysAgo(5),
  );
  event(
    P.ravi,
    "value_reached",
    { module: "courses", trigger: "course_page_3_plus_reviews", entry_id: pricing },
    daysAgo(5),
  );
  event(
    P.ravi,
    "return_visit",
    { day: shiftDay(today, -4), days_since_signup: 8, module: "courses" },
    daysAgo(4),
  );
  event(
    P.meera,
    "course_page_viewed",
    {
      course_id: COURSES[1].id,
      review_count: 4,
      has_new_or_changed_flag: false,
      current_term: "Term 7",
    },
    daysAgo(2),
  );

  // Background readers: anonymous activity for the metrics page.
  const {
    pgpReaders,
    ylReaders,
    valueShare,
    returnShare,
    postBid,
    chatClicks,
    chatEarlyAccess,
    formAbandoned,
  } = BACKGROUND;
  const total = pgpReaders + ylReaders;
  const answers = [
    ...Array(postBid.changed).fill("changed"),
    ...Array(postBid.confirmed).fill("confirmed"),
    ...Array(postBid.noEffect).fill("no_effect"),
    ...Array(postBid.didNotUse).fill("did_not_use"),
  ] as string[];
  const bands = ["0", "1-2", "1-2", "3-5", "6+"];
  for (let i = 0; i < total; i += 1) {
    const uid = id("ab", i + 1);
    const yl = i >= pgpReaders;
    const signed = daysAgo(3 + (i % 14));
    d.profiles.push({
      id: uid,
      email: `reader${i + 1}@isb.edu`,
      full_name: `Reader ${i + 1}`,
      programme: yl ? "pgp_yl" : "pgp",
      cohort: yl ? "YL 2026-28" : "Co'27",
      background_function: ["consulting", "engineering", "finance", "sales", "product"][i % 5],
      background_industry: ["bfsi", "it_software", "consulting", "fmcg_retail", "ecommerce"][i % 5],
      years_experience_band: ["0-2", "3-5", "6-8"][i % 3],
      target_track: ["product", "consulting", "finance", "marketing", "general_management"][i % 5],
      role: "reader",
      account_type: "isb",
      verification_status: "not_required",
      verified_by: null,
      verified_at: null,
      outreach_contact_id: null,
      source: ["whatsapp_group", "friend", "team_email"][i % 3],
      notify_pref: "instant",
      early_access_chat: i < chatEarlyAccess,
      early_access_people: false,
      profile_completed_at: signed,
      created_at: signed,
      deleted_at: null,
    });
    event(
      uid,
      "user_signed_up",
      { programme: yl ? "pgp_yl" : "pgp", cohort: yl ? "YL 2026-28" : "Co'27" },
      signed,
    );
    event(
      uid,
      "course_page_viewed",
      { course_id: COURSES[i % COURSES.length].id, current_term: "Term 7" },
      signed,
    );
    if (i < Math.round(total * valueShare))
      event(uid, "value_reached", { module: "courses" }, signed);
    if (i % Math.round(1 / returnShare) === 0)
      event(uid, "return_visit", { day: `bg-${i}`, module: "courses" }, signed);
    if (i < chatClicks)
      event(
        uid,
        "fake_door_clicked",
        { door: "request_chat", left_contact: i < chatEarlyAccess },
        signed,
      );
    if (i >= total - formAbandoned)
      event(uid, "form_started", { entry_type: "course_review" }, signed);
    if (!yl && i < answers.length) {
      d.survey_responses.push({
        id: id("5", i + 1),
        user_id: uid,
        survey: "post_bid",
        bid_effect: answers[i],
        changed_course_ids: answers[i] === "changed" ? [COURSES[i % 3].id] : null,
        career_action: null,
        action_text: null,
        seniors_asked_band: bands[i % bands.length],
        days_since_first_view: null,
        note: null,
        created_at: daysAgo(0),
      });
    }
  }

  d.seq = 1000;
  return d;
}

// --------------------------------------------------------- access helpers
export const profileOf = (d: Db, uid: string | null) =>
  uid ? (d.profiles.find((p) => p.id === uid && !p.deleted_at) ?? null) : null;

export const isModerator = (d: Db, uid: string | null) => profileOf(d, uid)?.role === "moderator";

export function canRead(d: Db, uid: string | null): boolean {
  const p = profileOf(d, uid);
  return (
    !!p &&
    !!p.profile_completed_at &&
    (p.account_type === "isb" || p.verification_status === "verified")
  );
}

export function canPublish(d: Db, uid: string): boolean {
  const p = profileOf(d, uid);
  return !!p && (p.account_type === "isb" || p.verification_status === "verified");
}

/** Row level security, as in 0002_access.sql: what a signed-in person may read directly. */
export function rlsVisible(d: Db, table: TableName, row: Row, uid: string | null): boolean {
  const mod = isModerator(d, uid);
  switch (table) {
    case "profiles":
      return row.id === uid || mod;
    case "offerings":
      return row.status === "approved" || row.created_by === uid || mod;
    case "course_reviews":
    case "career_entries":
      return row.author_id === uid || mod;
    case "comments":
      return row.author_id === uid || mod;
    case "flags":
      return row.reporter_id === uid || mod;
    case "survey_responses":
      return row.user_id === uid || mod;
    case "events":
    case "outreach_contacts":
      return mod;
    case "email_log":
      return false;
    default:
      return true;
  }
}

// ------------------------------------------------------------------- views
export function courseReviewsPublic(d: Db, uid: string | null): Row[] {
  if (!canRead(d, uid)) return [];
  const out: Row[] = [];
  for (const r of d.course_reviews) {
    if (r.status !== "live") continue;
    const o = d.offerings.find((x) => x.id === r.offering_id);
    if (!o || o.status !== "approved") continue;
    const p = d.profiles.find((x) => x.id === r.author_id);
    if (!p) continue;
    const named = r.visibility === "named";
    const behalf = str(r.on_behalf_of_name);
    const display =
      behalf && named
        ? `${behalf}, ${str(r.on_behalf_of_cohort) ?? "alum"}`
        : named
          ? `${str(p.full_name) ?? "ISB student"}, ${str(p.cohort) ?? ""}`
          : `Verified ${str(r.on_behalf_of_cohort) ?? str(p.cohort) ?? "ISB"} student`;
    const published = str(r.published_at);
    out.push({
      ...r,
      course_id: o.course_id,
      professor: o.professor,
      term_label: o.term_label,
      cohort_year: o.cohort_year,
      is_edited: published
        ? Date.parse(String(r.updated_at)) > Date.parse(published) + 60_000
        : false,
      author_id: named && !behalf ? r.author_id : null,
      author_display: display,
      author_cohort: str(r.on_behalf_of_cohort) ?? p.cohort,
      entered_by_team: !!behalf,
      is_mine: r.author_id === uid,
      // Never exposed by the real view.
      on_behalf_of_name: undefined,
      on_behalf_of_cohort: undefined,
      form_seconds: undefined,
      status: undefined,
    });
  }
  return out;
}

export function commentsPublic(d: Db, uid: string | null): Row[] {
  if (!canRead(d, uid)) return [];
  const out: Row[] = [];
  for (const c of d.comments) {
    if (c.status !== "live") continue;
    const entry =
      c.entry_type === "course_review"
        ? d.course_reviews.find((r) => r.id === c.entry_id)
        : d.career_entries.find((e) => e.id === c.entry_id);
    if (!entry || entry.status !== "live") continue;
    const p = d.profiles.find((x) => x.id === c.author_id);
    if (!p) continue;
    const isAuthor = c.author_id === entry.author_id;
    const hide = isAuthor && entry.visibility === "anonymous";
    out.push({
      id: c.id,
      entry_type: c.entry_type,
      entry_id: c.entry_id,
      parent_id: c.parent_id,
      body: c.body,
      created_at: c.created_at,
      first_reply_at: c.first_reply_at,
      is_entry_author: isAuthor,
      author_id: hide || p.deleted_at ? null : c.author_id,
      author_display: hide
        ? "Author"
        : p.deleted_at
          ? "Former member"
          : `${str(p.full_name) ?? "ISB student"}, ${str(p.cohort) ?? ""}`,
      is_mine: c.author_id === uid,
    });
  }
  return out;
}

export const VIEWS: Record<string, (d: Db, uid: string | null) => Row[]> = {
  course_reviews_public: courseReviewsPublic,
  comments_public: commentsPublic,
  career_entries_public: () => [],
};

// ---------------------------------------------------------------- triggers
const err = (message: string, code = "P0001"): DbError => ({ message, code });

/** Before insert or update on an entry (0002 enforce_entry_status). */
export function entryStatusTrigger(
  d: Db,
  uid: string | null,
  admin: boolean,
  row: Row,
  old: Row | null,
): DbError | null {
  row.updated_at = iso(now());
  if (!admin && uid && !isModerator(d, uid)) {
    if (old && old.status === "removed")
      return err("This entry was removed by a moderator and cannot be changed");
    if (row.status === "removed")
      return err("Only moderators can mark an entry removed; delete it instead");
    if (row.on_behalf_of_name || row.on_behalf_of_cohort)
      return err("Only moderators can enter an entry on behalf of someone");
    if (row.status !== "draft")
      row.status = canPublish(d, String(row.author_id)) ? "live" : "pending_verification";
  }
  if (row.status === "live" && !row.published_at) row.published_at = iso(now());
  return null;
}

/** May this person post this comment? (0007 can_comment) */
export function canComment(d: Db, uid: string | null, row: Row): boolean {
  if (!canRead(d, uid)) return false;
  const review = d.course_reviews.find((r) => r.id === row.entry_id);
  if (!review || review.status !== "live") return false;
  const o = d.offerings.find((x) => x.id === review.offering_id);
  if (!o || o.status !== "approved") return false;
  if (!row.parent_id) return review.open_to_questions === true;
  const q = d.comments.find((c) => c.id === row.parent_id);
  return !!q && !q.parent_id && q.status === "live" && q.entry_id === row.entry_id;
}

/** After a reply: stamp the question when the entry's author first answers (0002 stamp_first_reply). */
export function stampFirstReply(d: Db, row: Row): void {
  if (!row.parent_id) return;
  const review = d.course_reviews.find((r) => r.id === row.entry_id);
  const q = d.comments.find((c) => c.id === row.parent_id);
  if (review && q && review.author_id === row.author_id && !q.first_reply_at)
    q.first_reply_at = row.created_at;
}

/** Unique indexes from the migrations that the app relies on. */
export function uniqueViolation(d: Db, table: TableName, row: Row): DbError | null {
  const dup = (name: string) =>
    err(`duplicate key value violates unique constraint "${name}"`, "23505");
  if (table === "course_reviews" && !row.on_behalf_of_name) {
    if (
      d.course_reviews.some(
        (r) =>
          r.id !== row.id &&
          r.offering_id === row.offering_id &&
          r.author_id === row.author_id &&
          !r.on_behalf_of_name,
      )
    ) {
      return dup("course_reviews_one_per_author");
    }
  }
  if (table === "events") {
    const props = (row.props ?? {}) as Row;
    if (
      row.name === "value_reached" &&
      d.events.some(
        (e) =>
          e.name === "value_reached" &&
          e.user_id === row.user_id &&
          (e.props as Row)?.module === props.module,
      )
    ) {
      return dup("events_value_reached_once");
    }
    if (
      row.name === "return_visit" &&
      d.events.some(
        (e) =>
          e.name === "return_visit" &&
          e.user_id === row.user_id &&
          (e.props as Row)?.day === props.day,
      )
    ) {
      return dup("events_return_visit_once_a_day");
    }
  }
  if (table === "flags" && row.reporter_id) {
    if (
      d.flags.some(
        (f) =>
          !f.resolved_at &&
          f.reporter_id === row.reporter_id &&
          f.target_type === row.target_type &&
          f.target_id === row.target_id,
      )
    ) {
      return dup("flags_one_open_per_reporter");
    }
  }
  if (table === "survey_responses") {
    if (d.survey_responses.some((s) => s.user_id === row.user_id && s.survey === row.survey))
      return dup("survey_responses_user_id_survey_key");
  }
  return null;
}

// ------------------------------------------------------------------ surveys
const setting = (d: Db, key: string) => d.app_settings.find((s) => s.key === key)?.value as unknown;

function firstCareerView(d: Db, uid: string): string | null {
  const views = d.events
    .filter((e) => e.user_id === uid && e.name === "career_entry_viewed")
    .map((e) => String(e.created_at));
  return views.length ? views.sort()[0] : null;
}

export function surveyDue(d: Db, uid: string, survey: string, today: string): boolean {
  if (d.survey_responses.some((s) => s.user_id === uid && s.survey === survey)) return false;
  const p = profileOf(d, uid);
  if (!p) return false;
  if (survey === "post_bid") {
    const w = setting(d, "post_bid_survey_window") as { start: string; end: string } | undefined;
    if (!w || today < w.start || today > w.end) return false;
    const term = setting(d, "bid_term_label");
    return (
      p.cohort === setting(d, "post_bid_survey_cohort") &&
      d.events.some(
        (e) =>
          e.user_id === uid &&
          e.name === "course_page_viewed" &&
          (e.props as Row)?.current_term === term,
      )
    );
  }
  if (survey === "career_followup") {
    const first = firstCareerView(d, uid);
    if (!first) return false;
    const deadline = String(setting(d, "career_followup_deadline"));
    const due = [
      shiftDay(istDate(new Date(first)), Number(setting(d, "career_followup_days") ?? 14)),
      shiftDay(deadline, -1),
    ].sort()[0];
    return today >= due && today <= deadline;
  }
  return false;
}

// ---------------------------------------------------------------- functions
type RpcResult = { data: unknown; error: DbError | null };

export function rpc(d: Db, uid: string | null, admin: boolean, name: string, args: Row): RpcResult {
  const ok = (data: unknown = null): RpcResult => ({ data, error: null });
  const fail = (message: string): RpcResult => ({ data: null, error: err(message) });
  const mod = admin || isModerator(d, uid);
  const today = istDate(now());

  switch (name) {
    case "my_survey_status":
      return ok({
        post_bid: !!uid && surveyDue(d, uid, "post_bid", today),
        career_followup: !!uid && surveyDue(d, uid, "career_followup", today),
      });
    case "i_may_answer":
      return ok(!!uid && surveyDue(d, uid, String(args.p_survey), today));
    case "survey_due_users":
      return ok(
        d.profiles
          .filter(
            (p) =>
              !p.deleted_at &&
              surveyDue(d, String(p.id), String(args.p_survey), String(args.p_today)),
          )
          .map((p) => ({ user_id: p.id })),
      );

    case "verify_contributor": {
      if (!mod) return fail("Only moderators can verify contributors");
      const target = d.profiles.find(
        (p) => p.id === args.target && p.account_type === "contributor",
      );
      if (!target) return ok();
      const approve = args.approve !== false;
      target.verification_status = approve ? "verified" : "rejected";
      target.verified_by = uid;
      target.verified_at = iso(now());
      if (approve) {
        if (args.contact) {
          target.outreach_contact_id = args.contact;
          const c = d.outreach_contacts.find((x) => x.id === args.contact);
          if (c) c.claimed_by = target.id;
        }
        for (const r of d.course_reviews) {
          if (r.author_id === target.id && r.status === "pending_verification") {
            r.status = "live";
            r.published_at ??= iso(now());
          }
        }
      }
      return ok();
    }

    case "resolve_flags": {
      if (!mod) return fail("Only moderators can resolve flags");
      const type = args.p_target_type;
      const target = args.p_target_id;
      if (args.p_resolution === "removed") {
        const table =
          type === "comment"
            ? d.comments
            : type === "career_entry"
              ? d.career_entries
              : d.course_reviews;
        const row = table.find((r) => r.id === target);
        if (row) row.status = "removed";
      }
      for (const f of d.flags) {
        if (f.target_type === type && f.target_id === target && !f.resolved_at) {
          f.resolved_by = uid;
          f.resolved_at = iso(now());
          f.resolution = args.p_resolution;
        }
      }
      return ok();
    }

    case "delete_my_comment": {
      const c = d.comments.find((x) => x.id === args.target);
      if (!c || c.author_id !== uid) return fail("Comment not found");
      if (d.comments.some((x) => x.parent_id === c.id))
        c.body = "This comment was deleted by its author.";
      else d.comments.splice(d.comments.indexOf(c), 1);
      return ok();
    }

    case "delete_my_account": {
      if (!uid) return fail("Not signed in");
      d.career_entries = d.career_entries.filter((e) => e.author_id !== uid);
      d.course_reviews = d.course_reviews.filter((r) => r.author_id !== uid);
      for (const c of d.comments)
        if (c.author_id === uid) c.body = "This comment was deleted by its author.";
      for (const f of d.flags) if (f.reporter_id === uid) f.reporter_id = null;
      for (const c of d.outreach_contacts) if (c.claimed_by === uid) c.claimed_by = null;
      const p = d.profiles.find((x) => x.id === uid);
      if (p) {
        Object.assign(p, {
          email: `deleted-${uid}@deleted.invalid`,
          full_name: null,
          programme: null,
          cohort: null,
          background_function: null,
          background_industry: null,
          years_experience_band: null,
          target_track: null,
          source: null,
          notify_pref: "off",
          deleted_at: iso(now()),
        });
      }
      return ok();
    }

    case "admin_import_courses": {
      if (!mod) return fail("Only moderators can import courses");
      let courses = 0;
      let offerings = 0;
      for (const r of (args.rows as Row[]) ?? []) {
        const code = String(r.code).trim();
        let c = d.courses.find((x) => x.code === code);
        if (!c) {
          c = {
            id: newId(d, "c"),
            code,
            title: String(r.title).trim(),
            area: str(r.area) || null,
            open_to_readers: true,
            created_at: iso(now()),
          };
          d.courses.push(c);
          courses += 1;
        } else {
          c.title = String(r.title).trim();
          if (r.area) c.area = r.area;
        }
        const professor = String(r.professor ?? "").trim();
        if (!professor) continue;
        let o = d.offerings.find(
          (x) =>
            x.course_id === c!.id &&
            String(x.professor).toLowerCase() === professor.toLowerCase() &&
            x.term_label === r.term &&
            x.cohort_year === r.cohort,
        );
        if (!o) {
          o = {
            id: newId(d, "b"),
            course_id: c.id,
            professor,
            term_label: r.term,
            cohort_year: r.cohort,
            is_current: false,
            status: "approved",
            created_by: uid,
            created_at: iso(now()),
          };
          d.offerings.push(o);
          offerings += 1;
        } else {
          o.status = "approved";
        }
        if (r.current) {
          for (const x of d.offerings) if (x.course_id === c.id) x.is_current = x.id === o.id;
        }
      }
      return ok({ courses, offerings });
    }

    case "set_current_offering": {
      if (!mod) return fail("Only moderators can change the current offering");
      const o = d.offerings.find((x) => x.id === args.target && x.status === "approved");
      if (!o) return fail("Offering not found or not approved");
      for (const x of d.offerings) if (x.course_id === o.course_id) x.is_current = x.id === o.id;
      return ok();
    }

    case "admin_import_outreach": {
      if (!mod) return fail("Only moderators can import the outreach list");
      let contacts = 0;
      let unknown = 0;
      for (const r of (args.rows as Row[]) ?? []) {
        const name = String(r.name).trim();
        const cohort = str(r.cohort)?.trim() || null;
        let c = d.outreach_contacts.find(
          (x) =>
            String(x.full_name).toLowerCase() === name.toLowerCase() &&
            (x.cohort ?? "") === (cohort ?? ""),
        );
        if (!c) {
          c = {
            id: newId(d, "0a"),
            full_name: name,
            cohort,
            email: str(r.email)?.toLowerCase() || null,
            asked_course_ids: [],
            campaign: str(r.campaign) || null,
            claimed_by: null,
            created_at: iso(now()),
          };
          d.outreach_contacts.push(c);
          contacts += 1;
        }
        if (r.course_code) {
          const course = d.courses.find(
            (x) => String(x.code).toLowerCase() === String(r.course_code).toLowerCase(),
          );
          if (!course) unknown += 1;
          else
            c.asked_course_ids = [
              ...new Set([...((c.asked_course_ids as string[]) ?? []), course.id as string]),
            ];
        }
      }
      return ok({ contacts, unknown_courses: unknown });
    }

    case "metrics_snapshot":
      if (!mod) return fail("Only moderators can read metrics");
      return ok(metricsSnapshot(d));
  }
  return fail(`Unknown function ${name}`);
}

// --------------------------------------------------------- metrics snapshot
// A TypeScript port of metrics_snapshot() in 0008_surveys_metrics.sql.
const median = (xs: number[]): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function metricsSnapshot(d: Db): Row {
  const bidTerm = String(setting(d, "bid_term_label") ?? "Term 7");
  const cohort = String(setting(d, "post_bid_survey_cohort") ?? "Co'27");
  const submitted = d.course_reviews.filter(
    (r) => r.status === "live" || r.status === "pending_verification",
  );
  const own = submitted.filter((r) => !r.on_behalf_of_name);
  const bidCourses = new Set(
    d.offerings
      .filter((o) => o.is_current && o.status === "approved" && o.term_label === bidTerm)
      .map((o) => o.course_id),
  );
  const livePerCourse = new Map<unknown, number>();
  for (const r of d.course_reviews) {
    const o = d.offerings.find((x) => x.id === r.offering_id);
    if (r.status === "live" && o?.status === "approved")
      livePerCourse.set(o.course_id, (livePerCourse.get(o.course_id) ?? 0) + 1);
  }
  const careers = d.career_entries.filter(
    (e) => (e.status === "live" || e.status === "pending_verification") && !e.on_behalf_of_name,
  );
  const ev = (name: string) => d.events.filter((e) => e.name === name && e.user_id);
  const distinctUsers = (rows: Row[]) => new Set(rows.map((e) => e.user_id));
  const signups = new Map<unknown, string | null>();
  for (const e of ev("user_signed_up").sort((a, b) =>
    String(a.created_at).localeCompare(String(b.created_at)),
  )) {
    if (!signups.has(e.user_id)) signups.set(e.user_id, str((e.props as Row)?.programme));
  }
  const readers = [...signups]
    .filter(([, prog]) => prog === "pgp" || prog === "pgp_yl")
    .map(([u]) => u);
  const valueUsers = ev("value_reached");
  const returners = distinctUsers(ev("return_visit"));
  const questions = d.comments
    .filter((c) => !c.parent_id && c.status === "live")
    .map((c): Row & { replies: number } => ({
      ...c,
      replies: d.comments.filter((r) => r.parent_id === c.id && r.status === "live").length,
    }));
  const fortyEight = Date.now() - 48 * 3_600_000;
  const answeredHours = questions
    .filter((q) => q.first_reply_at)
    .map(
      (q) => (Date.parse(String(q.first_reply_at)) - Date.parse(String(q.created_at))) / 3_600_000,
    );
  const doors = (door: string) =>
    distinctUsers(ev("fake_door_clicked").filter((e) => (e.props as Row)?.door === door)).size;
  const pb = d.survey_responses.filter((s) => s.survey === "post_bid");
  const cf = d.survey_responses.filter((s) => s.survey === "career_followup");
  const byProgramme: Record<string, { arrived: number; value_reached: number; came_back: number }> =
    {};
  const valueSet = distinctUsers(valueUsers);
  for (const [u, prog] of signups) {
    if (!prog) continue;
    byProgramme[prog] ??= { arrived: 0, value_reached: 0, came_back: 0 };
    byProgramme[prog].arrived += 1;
    if (valueSet.has(u)) byProgramme[prog].value_reached += 1;
    if (returners.has(u)) byProgramme[prog].came_back += 1;
  }
  const seniors: Record<string, number> = {};
  for (const s of pb)
    seniors[String(s.seniors_asked_band)] = (seniors[String(s.seniors_asked_band)] ?? 0) + 1;

  return {
    reviews_live: own.filter((r) => r.status === "live").length,
    reviews_pending: own.filter((r) => r.status === "pending_verification").length,
    reviews_concierge: submitted.filter((r) => r.on_behalf_of_name).length,
    contributors: new Set(own.map((r) => r.author_id)).size,
    bid_term: bidTerm,
    bid_courses_total: bidCourses.size,
    bid_courses_3plus: [...bidCourses].filter((c) => (livePerCourse.get(c) ?? 0) >= 3).length,
    median_form_seconds: median(own.map((r) => Number(r.form_seconds) || 0).filter((s) => s > 0)),
    form_starters: distinctUsers(
      ev("form_started").filter((e) => (e.props as Row)?.entry_type === "course_review"),
    ).size,
    form_submitters: distinctUsers(
      ev("entry_submitted").filter((e) => (e.props as Row)?.entry_type === "course_review"),
    ).size,
    pb_responses: pb.length,
    pb_changed: pb.filter(
      (s) => s.bid_effect === "changed" && ((s.changed_course_ids as unknown[]) ?? []).length > 0,
    ).length,
    pb_confirmed: pb.filter((s) => s.bid_effect === "confirmed").length,
    pb_no_effect: pb.filter((s) => s.bid_effect === "no_effect").length,
    pb_did_not_use: pb.filter((s) => s.bid_effect === "did_not_use").length,
    pb_seniors: seniors,
    career_entries: careers.length,
    playbooks: careers.filter((e) => e.type === "playbook").length,
    company_notes: careers.filter((e) => e.type === "company_note").length,
    tracks_covered: new Set(careers.filter((e) => e.type === "playbook").map((e) => e.track)).size,
    cf_responses: cf.length,
    cf_named_action: cf.filter(
      (s) => s.career_action !== "none" && String(s.action_text ?? "").trim(),
    ).length,
    questions_total: questions.length,
    questions_due: questions.filter(
      (q) => q.first_reply_at || Date.parse(String(q.created_at)) <= fortyEight,
    ).length,
    questions_answered_48h: answeredHours.filter((h) => h <= 48).length,
    median_hours_to_answer: median(answeredHours),
    arrived: signups.size,
    readers_arrived: readers.length,
    value_courses: distinctUsers(valueUsers.filter((e) => (e.props as Row)?.module === "courses"))
      .size,
    value_career: distinctUsers(valueUsers.filter((e) => (e.props as Row)?.module === "career"))
      .size,
    value_any: valueSet.size,
    came_back: returners.size,
    readers_came_back: readers.filter((u) => returners.has(u)).length,
    by_programme: byProgramme,
    yl_signups: [...signups.values()].filter((p) => p === "pgp_yl").length,
    yl_questions: questions.filter((q) => {
      const asker = d.profiles.find((p) => p.id === q.author_id);
      const review = d.course_reviews.find((r) => r.id === q.entry_id);
      const writer = review && d.profiles.find((p) => p.id === review.author_id);
      return asker?.programme === "pgp_yl" && writer?.cohort === cohort;
    }).length,
    entry_readers: distinctUsers(
      d.events.filter(
        (e) => e.user_id && (e.name === "course_page_viewed" || e.name === "career_entry_viewed"),
      ),
    ).size,
    chat_clickers: doors("request_chat"),
    chat_contacts: d.profiles.filter((p) => p.early_access_chat && !p.deleted_at).length,
    threads_long: questions.filter((q) => q.replies >= 3).length,
    career_readers: distinctUsers(ev("career_entry_viewed")).size,
    people_clickers: doors("find_people"),
    people_contacts: d.profiles.filter((p) => p.early_access_people && !p.deleted_at).length,
    outside_contributors_published: new Set(
      own
        .filter((r) => d.profiles.find((p) => p.id === r.author_id)?.account_type === "contributor")
        .map((r) => r.author_id),
    ).size,
    computed_at: iso(now()),
  };
}

/** Before insert of a survey answer (0008 policy and trigger). */
export function surveyInsertCheck(
  d: Db,
  uid: string | null,
  admin: boolean,
  row: Row,
): DbError | null {
  if (
    !admin &&
    (!uid || row.user_id !== uid || !surveyDue(d, uid, String(row.survey), istDate(now())))
  ) {
    return err("new row violates row-level security policy", "42501");
  }
  if (
    row.survey === "post_bid" &&
    (!row.bid_effect ||
      !row.seniors_asked_band ||
      (row.bid_effect === "changed" && !((row.changed_course_ids as unknown[]) ?? []).length))
  ) {
    return err('new row violates check constraint "survey_complete"', "23514");
  }
  row.days_since_first_view = null;
  if (row.survey === "career_followup") {
    const first = firstCareerView(d, String(row.user_id));
    if (first)
      row.days_since_first_view = Math.round(
        (Date.parse(istDate(now())) - Date.parse(istDate(new Date(first)))) / 86_400_000,
      );
  }
  return null;
}

/** The demo's people, for the "choose who to be" screen. */
/** The persona entry for a signed-in demo person, if they have one. */
export function personaOf(uid: string | null) {
  const person = uid ? PEOPLE.find((p) => p.id === uid) : undefined;
  return person?.persona
    ? { name: person.full_name, email: person.email, ...person.persona }
    : null;
}

export function personas() {
  return PEOPLE.filter((p) => p.persona).map((p) => ({
    id: p.id,
    email: p.email,
    ...p.persona!,
    completed: p.completedDaysAgo !== null,
  }));
}

/**
 * Demo sign-in by email: the sample person with that address, or a new account
 * that starts at "About you". An ISB address gets a reader account; any other
 * address is a contributor waiting for verification, as in the real app.
 */
export function demoProfileForEmail(
  d: Db,
  email: string,
  isb: boolean,
): { id: string; completed: boolean } {
  const known = d.profiles.find((p) => p.email === email && !p.deleted_at);
  if (known) return { id: String(known.id), completed: !!known.profile_completed_at };
  const uid = newId(d, "d");
  d.profiles.push({
    id: uid,
    email,
    full_name: null,
    programme: null,
    cohort: null,
    background_function: null,
    background_industry: null,
    years_experience_band: null,
    target_track: null,
    role: "reader",
    account_type: isb ? "isb" : "contributor",
    verification_status: isb ? "not_required" : "pending",
    verified_by: null,
    verified_at: null,
    outreach_contact_id: null,
    source: null,
    notify_pref: "instant",
    early_access_chat: false,
    early_access_people: false,
    profile_completed_at: null,
    created_at: iso(now()),
    deleted_at: null,
  });
  return { id: uid, completed: false };
}
