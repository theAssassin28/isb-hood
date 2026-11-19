import { describe, expect, it } from "vitest";
import {
  attainment,
  bidDecision,
  buildReport,
  careerDecision,
  reportCsv,
  supplyDecision,
  type Snapshot,
} from "@/lib/domain/metrics";

const empty: Snapshot = {
  reviews_live: 0,
  reviews_pending: 0,
  reviews_concierge: 0,
  contributors: 0,
  bid_term: "Term 7",
  bid_courses_total: 0,
  bid_courses_3plus: 0,
  median_form_seconds: null,
  form_starters: 0,
  form_submitters: 0,
  pb_responses: 0,
  pb_changed: 0,
  pb_confirmed: 0,
  pb_no_effect: 0,
  pb_did_not_use: 0,
  pb_seniors: {},
  career_entries: 0,
  playbooks: 0,
  company_notes: 0,
  tracks_covered: 0,
  cf_responses: 0,
  cf_named_action: 0,
  questions_total: 0,
  questions_due: 0,
  questions_answered_48h: 0,
  median_hours_to_answer: null,
  arrived: 0,
  readers_arrived: 0,
  value_courses: 0,
  value_career: 0,
  value_any: 0,
  came_back: 0,
  readers_came_back: 0,
  by_programme: {},
  yl_signups: 0,
  yl_questions: 0,
  entry_readers: 0,
  chat_clickers: 0,
  chat_contacts: 0,
  threads_long: 0,
  career_readers: 0,
  people_clickers: 0,
  people_contacts: 0,
  outside_contributors_published: 0,
  computed_at: "2027-01-03T00:00:00Z",
};

const row = (s: Snapshot, label: string) =>
  buildReport(s)
    .flatMap((section) => section.rows)
    .find((r) => r.label.startsWith(label))!;

describe("decision rules", () => {
  it("supply bands at 50% and 100%", () => {
    expect(supplyDecision(0.49).text).toMatch(/stop building/);
    expect(supplyDecision(0.5).text).toMatch(/one more 5-day drive/);
    expect(supplyDecision(0.99).text).toMatch(/one more 5-day drive/);
    expect(supplyDecision(1).text).toMatch(/open to readers/);
  });

  it("supply is held back by its weakest part", () => {
    expect(
      attainment([
        [40, 40],
        [10, 20],
        [10, 10],
      ]),
    ).toBe(0.5);
  });

  it("bid outcome: inconclusive under 30, then 10% and 20% bands", () => {
    expect(bidDecision(29, 29).text).toMatch(/^Inconclusive: 29 of 30/);
    expect(bidDecision(30, 2).text).toMatch(/rethink/);
    expect(bidDecision(30, 3).text).toMatch(/iterate/);
    expect(bidDecision(30, 6).text).toMatch(/continue/);
  });

  it("career outcome: inconclusive under 20, then 15% and 30% bands", () => {
    expect(careerDecision(19, 19).text).toMatch(/^Inconclusive/);
    expect(careerDecision(20, 2).text).toMatch(/drop career/);
    expect(careerDecision(20, 3).text).toMatch(/rework/);
    expect(careerDecision(20, 6).text).toMatch(/continue/);
  });
});

describe("rows", () => {
  it("never pass or fail a survey row under its minimum sample", () => {
    const r = row({ ...empty, pb_responses: 10, pb_changed: 9 }, "Changed a bid");
    expect(r.status).toBe("inconclusive");
    expect(r.note).toMatch(/extend the survey/);
  });

  it("pass and fail survey rows once the sample is there", () => {
    expect(row({ ...empty, pb_responses: 30, pb_changed: 6 }, "Changed a bid").status).toBe("pass");
    expect(row({ ...empty, pb_responses: 30, pb_changed: 5 }, "Changed a bid").status).toBe("fail");
  });

  it("counts pending reviews towards supply and keeps concierge reviews out", () => {
    const r = row(
      { ...empty, reviews_live: 30, reviews_pending: 10, reviews_concierge: 8 },
      "Reviews submitted",
    );
    expect(r.value).toBe("40");
    expect(r.status).toBe("pass");
  });

  it("show 'no data' rather than 0% when there is nothing to divide by", () => {
    const r = row(empty, "Answered within 48 hours");
    expect(r.value).toBe("—");
    expect(r.status).toBe("info");
  });

  it("formats median writing time", () => {
    expect(row({ ...empty, median_form_seconds: 250 }, "Median time").value).toBe("4 min 10 s");
  });

  it("call for chat only on its own evidence", () => {
    const decision = (s: Snapshot) =>
      buildReport(s).find((x) => x.title.startsWith("Fake doors"))!.decision!.text;
    expect(decision({ ...empty, entry_readers: 100, chat_clickers: 15 })).toMatch(
      /F8 chat: evidence is there/,
    );
    expect(decision({ ...empty, questions_total: 10, threads_long: 2 })).toMatch(
      /F8 chat: evidence is there/,
    );
    expect(decision({ ...empty, entry_readers: 100, chat_clickers: 14 })).toMatch(
      /F8 chat: not yet/,
    );
    expect(
      decision({ ...empty, career_readers: 10, people_clickers: 2, people_contacts: 9 }),
    ).toMatch(/F9 people finder: not yet/);
  });
});

describe("reportCsv", () => {
  it("quotes cells and includes decisions", () => {
    const csv = reportCsv(buildReport(empty));
    expect(csv.split("\n")[0]).toBe('"section","metric","value","target","status","note"');
    expect(csv).toContain('"Decision","Supply at 0% of target.');
    expect(csv).toContain('"“Request a chat” click-through (readers of entries)"');
  });
});
