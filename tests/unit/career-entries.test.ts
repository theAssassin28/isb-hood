import { beforeEach, describe, expect, it } from "vitest";
import { createDemoClient } from "@/lib/demo/client";
import { db, resetDb } from "@/lib/demo/db";
import { COMPANY_NOTES, PLAYBOOKS } from "@/lib/demo/seed-careers";
import { P, PEOPLE } from "@/lib/demo/seed-data";
import {
  buildPathway,
  careerTitle,
  filterCareerEntries,
  matchesBackground,
  parseCareerFilters,
  PUBLIC_CAREER_COLUMNS,
  toPublicCareerEntry,
  trackCounts,
  type PublicCareerEntry,
} from "@/lib/domain/careers";
import { companyNoteSchema, playbookSchema } from "@/lib/schemas/careerEntry";

// Career entries (requirements 5.2, 5.3; docs/BUILD_PLAN.md 4.6, 6.3): the
// sample data, the "Like me" rule, the track pathway, and the demo database's
// handling of anonymity, verification and questions.

const as = (uid: string | null) => createDemoClient({ uid, admin: false });
const ravi = PEOPLE.find((p) => p.id === P.ravi)!;

async function entriesFor(uid: string): Promise<PublicCareerEntry[]> {
  const { data } = await as(uid).from("career_entries_public").select(PUBLIC_CAREER_COLUMNS);
  return (data as Record<string, unknown>[])
    .map(toPublicCareerEntry)
    .filter((e): e is PublicCareerEntry => e !== null);
}

beforeEach(() => resetDb());

describe("career sample data", () => {
  it("parses with the same schemas the forms use", () => {
    for (const pb of PLAYBOOKS) {
      const body = {
        from: pb.from,
        to: pb.to,
        path: pb.path,
        numbers: pb.numbers,
        what_mattered: pb.mattered,
        latest_safe_start: pb.latest_safe_start,
        mistakes_to_avoid: pb.mistakes_to_avoid,
      };
      expect(playbookSchema.safeParse(body).success, pb.key).toBe(true);
    }
    for (const cn of COMPANY_NOTES) {
      const body = {
        ...cn,
        key: undefined,
        author: undefined,
        anonymous: undefined,
        daysAgo: undefined,
      };
      const { key } = cn;
      expect(companyNoteSchema.safeParse(body).success, key).toBe(true);
    }
  });

  it("covers every track and meets the Test 2 supply bar", async () => {
    const entries = await entriesFor(P.ravi);
    const playbooks = entries.filter((e) => e.type === "playbook");
    expect(playbooks.length).toBeGreaterThanOrEqual(5);
    expect(new Set(playbooks.map((e) => e.track)).size).toBeGreaterThanOrEqual(3);
    expect(entries.filter((e) => e.type === "company_note").length).toBeGreaterThanOrEqual(5);
    expect(trackCounts(entries).every((t) => t.playbooks + t.notes > 0)).toBe(true);
  });
});

describe("career view in the demo", () => {
  it("hides anonymous authors and never returns author ids", async () => {
    const entries = await entriesFor(P.ravi);
    const sid = entries.find((e) => careerTitle(e).startsWith("Engineering → Consulting"));
    expect(sid?.author_display).toBe("Verified Co'26 student");
    const { data } = await as(P.ravi).from("career_entries_public").select("*");
    for (const row of data as Record<string, unknown>[]) {
      if (row.visibility === "anonymous") expect(row.author_id).toBeNull();
    }
  });

  it("holds an unverified alum's playbook until a moderator verifies him", async () => {
    const before = await entriesFor(P.ravi);
    expect(before.some((e) => e.company === "Asian Paints")).toBe(false);
    await as(P.nisha).rpc("verify_contributor", { target: P.dev, approve: true });
    const after = await entriesFor(P.ravi);
    expect(after.some((e) => e.company === "Asian Paints")).toBe(true);
  });

  it("shows nothing to someone who may not read", async () => {
    expect(await entriesFor(P.dev)).toEqual([]);
  });

  it("lets readers ask the author and stamps the first answer", async () => {
    const entry = db().career_entries.find(
      (e) => e.author_id === P.arnav && e.type === "playbook",
    ) as { id: string };
    const ask = await as(P.ravi)
      .from("comments")
      .insert({
        entry_type: "career_entry",
        entry_id: entry.id,
        parent_id: null,
        author_id: P.ravi,
        body: "Which side project?",
      })
      .select("id")
      .single();
    expect(ask.error).toBeNull();
    const askId = (ask.data as { id: string }).id;
    await as(P.arnav).from("comments").insert({
      entry_type: "career_entry",
      entry_id: entry.id,
      parent_id: askId,
      author_id: P.arnav,
      body: "A small expense tracker.",
    });
    expect(db().comments.find((c) => c.id === askId)?.first_reply_at).toBeTruthy();
  });
});

describe("Like me and the pathway", () => {
  it("matches Ravi (consulting, BFSI) on function or industry, function matches first", async () => {
    const entries = await entriesFor(P.ravi);
    const like = filterCareerEntries(entries, parseCareerFilters({ like: "1" }), ravi);
    expect(like.length).toBeGreaterThan(0);
    expect(like.every((e) => matchesBackground(e, ravi))).toBe(true);
    // Farah (consulting → product) matches both function and Ravi's target track.
    expect(like.slice(0, 2).map((e) => e.author_display)).toEqual([
      "Farah Khan, Co'26",
      "Farah Khan, Co'26",
    ]);
  });

  it("lines up every product playbook by stage", async () => {
    const p = buildPathway("product", await entriesFor(P.ravi));
    expect(p.playbooks).toHaveLength(3);
    expect(p.stages.map((s) => s.key)).toEqual([
      "before_isb",
      "early_terms",
      "mid_terms",
      "late_terms",
      "placement_weeks",
    ]);
    expect(p.stages[1].lines).toHaveLength(3);
    expect(p.funnel.find((f) => f.label === "Offers")?.band).toBe("1-2");
    expect(p.mattered[0]).toMatchObject({ value: "case_or_interview_prep", count: 3 });
    expect(p.notes.map((n) => n.company).sort()).toEqual(["Amazon", "Microsoft", "Razorpay"]);
  });
});
