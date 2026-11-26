import { beforeEach, describe, expect, it } from "vitest";
import { createDemoClient, parseSelect } from "@/lib/demo/client";
import { db, resetDb } from "@/lib/demo/db";
import { COURSES, P, REVIEWS } from "@/lib/demo/seed-data";

// The demo's stand-in database must keep the rules that matter in a
// presentation: anonymous authors stay anonymous, unverified alumni cannot
// read, publishing and verification behave as in the real database.

const as = (uid: string | null) => createDemoClient({ uid, admin: false });
const admin = createDemoClient({ uid: null, admin: true });

beforeEach(() => resetDb());

describe("demo seed", () => {
  it("loads every course, review and person", () => {
    expect(db().courses).toHaveLength(COURSES.length);
    expect(db().course_reviews).toHaveLength(REVIEWS.length);
    expect(db().profiles.find((p) => p.id === P.ravi)?.full_name).toBe("Ravi Menon");
  });

  it("has evaluation mixes that total 100", () => {
    for (const r of REVIEWS)
      expect(
        r.mix.reduce((a, b) => a + b, 0),
        r.key,
      ).toBe(100);
  });
});

describe("demo views", () => {
  it("hide an anonymous author's identity", async () => {
    const { data } = await as(P.ravi).from("course_reviews_public").select("*");
    const kiran = (data as Record<string, unknown>[]).filter(
      (r) => r.author_display === "Verified Co'26 student",
    );
    expect(kiran.length).toBeGreaterThan(0);
    for (const r of kiran) {
      expect(r.author_id).toBeNull();
      expect(JSON.stringify(r)).not.toContain(P.kiran);
      expect(JSON.stringify(r)).not.toContain("Kiran");
    }
  });

  it("show an anonymous author's reply as 'Author'", async () => {
    const { data } = await as(P.ravi).from("comments_public").select("*");
    const replies = (data as Record<string, unknown>[]).filter(
      (c) => c.author_display === "Author",
    );
    expect(replies.length).toBeGreaterThan(0);
    expect(replies.every((c) => c.author_id === null)).toBe(true);
  });

  it("show nothing to an alum who is not verified yet", async () => {
    const { data } = await as(P.dev).from("course_reviews_public").select("id");
    expect(data).toEqual([]);
  });

  it("let people read only their own rows of the base tables", async () => {
    const { data: reviews } = await as(P.ravi).from("course_reviews").select("id, author_id");
    expect((reviews as { author_id: string }[]).every((r) => r.author_id === P.ravi)).toBe(true);
    const { data: everyone } = await as(P.nisha).from("profiles").select("id");
    expect((everyone as unknown[]).length).toBeGreaterThan(10);
  });
});

describe("demo queries", () => {
  it("parse embedded selects", () => {
    expect(
      parseSelect("id, offering:offerings!inner(professor, course:courses!inner(id, title))"),
    ).toEqual([
      { kind: "col", name: "id" },
      {
        kind: "embed",
        alias: "offering",
        table: "offerings",
        inner: true,
        fields: [
          { kind: "col", name: "professor" },
          {
            kind: "embed",
            alias: "course",
            table: "courses",
            inner: true,
            fields: [
              { kind: "col", name: "id" },
              { kind: "col", name: "title" },
            ],
          },
        ],
      },
    ]);
  });

  it("join a review to its offering and course", async () => {
    const { data } = await as(P.ravi)
      .from("course_reviews")
      .select("id, offering:offerings!inner(professor, course:courses!inner(title))")
      .eq("author_id", P.ravi);
    expect((data as { offering: { course: { title: string } } }[])[0].offering.course.title).toBe(
      "Business Analytics",
    );
  });

  it("list courses with their offerings, filter, order and limit", async () => {
    const { data } = await as(P.ravi)
      .from("courses")
      .select("id, title, offerings(professor, is_current)")
      .order("title")
      .limit(2);
    const list = data as { title: string; offerings: unknown[] }[];
    expect(list).toHaveLength(2);
    expect(list[0].title < list[1].title).toBe(true);
    expect(list[0].offerings.length).toBeGreaterThan(0);
  });
});

describe("demo writes", () => {
  it("publish an ISB reader's review straight away and hold an unverified alum's", async () => {
    const offering = db().offerings.find((o) => o.is_current)!.id;
    const mine = await as(P.meera)
      .from("course_reviews")
      .insert({ offering_id: offering, author_id: P.meera, status: "live" })
      .select("status")
      .single();
    expect((mine.data as { status: string }).status).toBe("live");
    const pending = await as(P.dev)
      .from("course_reviews")
      .insert({ offering_id: offering, author_id: P.dev, status: "live" })
      .select("status")
      .single();
    expect((pending.data as { status: string }).status).toBe("pending_verification");
  });

  it("publish everything an alum has waiting when a moderator verifies them", async () => {
    const before = await as(P.ravi).from("course_reviews_public").select("id");
    await as(P.nisha).rpc("verify_contributor", { target: P.dev, approve: true, contact: null });
    const after = await as(P.ravi).from("course_reviews_public").select("id");
    expect((after.data as unknown[]).length).toBe((before.data as unknown[]).length + 1);
    expect((await as(P.ravi).rpc("verify_contributor", { target: P.dev })).error?.message).toMatch(
      /Only moderators/,
    );
  });

  it("refuse a question on a review closed to questions, with the database's error code", async () => {
    const closed = db().course_reviews.find((r) => r.open_to_questions === false)!;
    const { error } = await as(P.ravi)
      .from("comments")
      .insert({ entry_type: "course_review", entry_id: closed.id, author_id: P.ravi, body: "Hi?" })
      .select("id")
      .single();
    expect(error?.code).toBe("42501");
  });

  it("stamp a question when the author first answers it", async () => {
    const waiting = db().comments.find(
      (c) => !c.parent_id && !c.first_reply_at && c.body?.toString().includes("placement load"),
    )!;
    await as(P.kiran).from("comments").insert({
      entry_type: "course_review",
      entry_id: waiting.entry_id,
      parent_id: waiting.id,
      author_id: P.kiran,
      body: "Yes, but plan ahead.",
    });
    expect(db().comments.find((c) => c.id === waiting.id)?.first_reply_at).toBeTruthy();
  });

  it("record value_reached once per module", async () => {
    const insert = () =>
      as(P.meera)
        .from("events")
        .insert({ user_id: P.meera, name: "value_reached", props: { module: "courses" } });
    expect((await insert()).error).toBeNull();
    expect((await insert()).error?.code).toBe("23505");
  });

  it("show the post-bid survey to Ravi only after he opens a Term 7 course", async () => {
    const due = async (uid: string) =>
      ((await as(uid).rpc("my_survey_status")).data as { post_bid: boolean }).post_bid;
    expect(await due(P.ravi)).toBe(false);
    await admin.from("events").insert({
      user_id: P.ravi,
      name: "course_page_viewed",
      props: { course_id: COURSES[0].id, current_term: "Term 7" },
    });
    expect(await due(P.ravi)).toBe(true);
    expect(await due(P.asha)).toBe(false);
  });
});

describe("demo metrics", () => {
  it("count the seeded supply and survey answers, for moderators only", async () => {
    const { data } = await as(P.nisha).rpc("metrics_snapshot");
    const m = data as Record<string, number>;
    const seededLive = REVIEWS.filter(
      (r) => (r.status ?? "live") === "live" && !r.onBehalfOf,
    ).length;
    expect(m.reviews_live).toBe(seededLive);
    expect(m.reviews_pending).toBe(1);
    expect(m.reviews_concierge).toBe(1);
    expect(m.pb_responses).toBe(32);
    expect(m.pb_changed).toBe(8);
    expect((await as(P.ravi).rpc("metrics_snapshot")).error?.message).toMatch(/Only moderators/);
    expect((await admin.rpc("metrics_snapshot")).error).toBeNull();
  });
});
