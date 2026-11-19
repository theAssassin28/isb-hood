// Turns metrics_snapshot() into the rows of /admin/metrics, with each pass
// line and decision rule from docs/BUILD_PLAN.md 8.2 and 10. Pure.

export type Snapshot = {
  reviews_live: number;
  reviews_pending: number;
  reviews_concierge: number;
  contributors: number;
  bid_term: string;
  bid_courses_total: number;
  bid_courses_3plus: number;
  median_form_seconds: number | null;
  form_starters: number;
  form_submitters: number;
  pb_responses: number;
  pb_changed: number;
  pb_confirmed: number;
  pb_no_effect: number;
  pb_did_not_use: number;
  pb_seniors: Record<string, number>;
  career_entries: number;
  playbooks: number;
  company_notes: number;
  tracks_covered: number;
  cf_responses: number;
  cf_named_action: number;
  questions_total: number;
  questions_due: number;
  questions_answered_48h: number;
  median_hours_to_answer: number | null;
  arrived: number;
  readers_arrived: number;
  value_courses: number;
  value_career: number;
  value_any: number;
  came_back: number;
  readers_came_back: number;
  by_programme: Record<string, { arrived: number; value_reached: number; came_back: number }>;
  yl_signups: number;
  yl_questions: number;
  entry_readers: number;
  chat_clickers: number;
  chat_contacts: number;
  threads_long: number;
  career_readers: number;
  people_clickers: number;
  people_contacts: number;
  outside_contributors_published: number;
  computed_at: string;
};

export type Status = "pass" | "not_yet" | "fail" | "inconclusive" | "info";
export type Row = { label: string; value: string; target: string; status: Status; note?: string };
export type Decision = { text: string; tone: "good" | "warn" | "bad" | "neutral" };
export type Section = { title: string; rows: Row[]; decision?: Decision };

// Targets (plan 1 and 8.2). One place, so the page and the tests agree.
export const TARGETS = {
  reviews: 40,
  contributors: 20,
  bidCourses3plus: 10,
  bidCoverage: 0.5,
  postBidMinSample: 30,
  changedPass: 0.2,
  changedIterate: 0.1,
  careerEntries: 10,
  playbooks: 5,
  tracks: 3,
  companyNotes: 5,
  careerMinSample: 20,
  actionPass: 0.3,
  actionRework: 0.15,
  answered48h: 0.7,
  returnShare: 0.25,
  ylSignups: 30,
  ylQuestions: 10,
  doorClickThrough: 0.15,
  longThreadShare: 0.2,
  peopleContacts: 10,
  outsideContributors: 5,
} as const;

const share = (part: number, whole: number) => (whole > 0 ? part / whole : null);
export const pct = (value: number | null) => (value === null ? "—" : `${Math.round(value * 100)}%`);
const atLeast = (value: number, target: number): Status => (value >= target ? "pass" : "not_yet");

function count(value: number, target: number, label: string, note?: string): Row {
  return {
    label,
    value: String(value),
    target: String(target),
    status: atLeast(value, target),
    note,
  };
}

function minutes(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m === 0 ? `${s} s` : `${m} min ${s} s`;
}

/** How close supply is to target: the weakest of its parts, since all must pass. */
export function attainment(parts: [number, number][]): number {
  return Math.min(...parts.map(([value, target]) => value / target));
}

/** Supply decision rule (plan 10). */
export function supplyDecision(ratio: number): Decision {
  const at = `Supply at ${Math.round(ratio * 100)}% of target. `;
  if (ratio < 0.5) {
    return {
      tone: "bad",
      text:
        at +
        "Under 50%: stop building. Concierge: the team interviews seniors and writes the entries.",
    };
  }
  if (ratio < 1) {
    return {
      tone: "warn",
      text:
        at +
        "50 to 99%: one more 5-day drive with a shorter form and named asks, then open only courses or tracks with 3+ entries.",
    };
  }
  return { tone: "good", text: at + "Met: open to readers and read the outcome." };
}

/** Test 1 outcome rule. Under the minimum sample nothing is decided. */
export function bidDecision(responses: number, changed: number): Decision {
  if (responses < TARGETS.postBidMinSample) {
    return {
      tone: "neutral",
      text: `Inconclusive: ${responses} of ${TARGETS.postBidMinSample} responses. Extend the survey, do not decide.`,
    };
  }
  const r = changed / responses;
  if (r < TARGETS.changedIterate)
    return { tone: "bad", text: `${pct(r)} changed a bid: rethink the format.` };
  if (r < TARGETS.changedPass) {
    return {
      tone: "warn",
      text: `${pct(r)} changed a bid: iterate (comparison view, fewer fields) and retest at the next bid.`,
    };
  }
  return {
    tone: "good",
    text: `${pct(r)} changed a bid: continue; widen to all of Co'27 and PGP YL.`,
  };
}

/** Test 2 outcome rule. */
export function careerDecision(responses: number, acted: number): Decision {
  if (responses < TARGETS.careerMinSample) {
    return {
      tone: "neutral",
      text: `Inconclusive: ${responses} of ${TARGETS.careerMinSample} responses. Extend the survey, do not decide.`,
    };
  }
  const r = acted / responses;
  if (r < TARGETS.actionRework)
    return { tone: "bad", text: `${pct(r)} named an action: drop career for now.` };
  if (r < TARGETS.actionPass)
    return { tone: "warn", text: `${pct(r)} named an action: rework the entry fields.` };
  return { tone: "good", text: `${pct(r)} named an action: continue.` };
}

function sampleGated(
  label: string,
  part: number,
  responses: number,
  minimum: number,
  pass: number,
): Row {
  const r = share(part, responses);
  return {
    label,
    value: r === null ? "—" : `${pct(r)} (${part} of ${responses})`,
    target: pct(pass),
    status: responses < minimum ? "inconclusive" : (r ?? 0) >= pass ? "pass" : "fail",
    note: responses < minimum ? `Under ${minimum} responses: extend the survey` : undefined,
  };
}

function ratioRow(label: string, part: number, whole: number, target: number, note?: string): Row {
  const r = share(part, whole);
  return {
    label,
    value: r === null ? "—" : `${pct(r)} (${part} of ${whole})`,
    target: pct(target),
    status: r === null ? "info" : r >= target ? "pass" : "not_yet",
    note: r === null ? "No data yet" : note,
  };
}

export function buildReport(s: Snapshot): Section[] {
  const submitted = s.reviews_live + s.reviews_pending;
  const t1 = attainment([
    [submitted, TARGETS.reviews],
    [s.contributors, TARGETS.contributors],
    [s.bid_courses_3plus, TARGETS.bidCourses3plus],
  ]);
  const t2 = attainment([
    [s.career_entries, TARGETS.careerEntries],
    [s.playbooks, TARGETS.playbooks],
    [s.tracks_covered, TARGETS.tracks],
    [s.company_notes, TARGETS.companyNotes],
  ]);
  const chatCtr = share(s.chat_clickers, s.entry_readers) ?? 0;
  const longThreads = share(s.threads_long, s.questions_total) ?? 0;
  const peopleCtr = share(s.people_clickers, s.career_readers) ?? 0;
  const seniors = ["0", "1-2", "3-5", "6+"]
    .map((band) => `${band}: ${s.pb_seniors[band] ?? 0}`)
    .join(" · ");

  return [
    {
      title: "Test 1 · Course supply (by 3 Jan)",
      rows: [
        count(
          submitted,
          TARGETS.reviews,
          "Reviews submitted",
          `${s.reviews_live} live, ${s.reviews_pending} waiting for verification`,
        ),
        count(s.contributors, TARGETS.contributors, "Contributors"),
        count(
          s.bid_courses_3plus,
          TARGETS.bidCourses3plus,
          `${s.bid_term} courses with 3+ reviews`,
        ),
        ratioRow(
          `Share of ${s.bid_term} electives with 3+ reviews (P1)`,
          s.bid_courses_3plus,
          s.bid_courses_total,
          TARGETS.bidCoverage,
        ),
        {
          label: "Reviews the team entered for seniors",
          value: String(s.reviews_concierge),
          target: "—",
          status: "info",
          note: "Not counted towards supply",
        },
        {
          label: "Median time to write a review",
          value: minutes(s.median_form_seconds),
          target: "about 5 min",
          status: "info",
        },
        {
          label: "Started the form and submitted",
          value:
            s.form_starters === 0
              ? "—"
              : `${pct(share(s.form_submitters, s.form_starters))} (${s.form_submitters} of ${s.form_starters})`,
          target: "—",
          status: "info",
          note: "Where contributors drop off",
        },
      ],
      decision: supplyDecision(t1),
    },
    {
      title: "Test 1 · Did reviews change bids?",
      rows: [
        {
          label: "Post-bid survey responses",
          value: String(s.pb_responses),
          target: `${TARGETS.postBidMinSample} minimum`,
          status: s.pb_responses >= TARGETS.postBidMinSample ? "pass" : "not_yet",
        },
        sampleGated(
          "Changed a bid, naming the course",
          s.pb_changed,
          s.pb_responses,
          TARGETS.postBidMinSample,
          TARGETS.changedPass,
        ),
        {
          label: "Confirmed a bid (reported, not counted)",
          value: `${s.pb_confirmed} (${pct(share(s.pb_confirmed, s.pb_responses))})`,
          target: "—",
          status: "info",
        },
        {
          label: "No effect",
          value: `${s.pb_no_effect} (${pct(share(s.pb_no_effect, s.pb_responses))})`,
          target: "—",
          status: "info",
        },
        {
          label: "Did not use ISB Hood",
          value: `${s.pb_did_not_use} (${pct(share(s.pb_did_not_use, s.pb_responses))})`,
          target: "—",
          status: "info",
        },
        { label: "Seniors asked this time", value: seniors, target: "—", status: "info" },
      ],
      decision: bidDecision(s.pb_responses, s.pb_changed),
    },
    {
      title: "Test 2 · Career supply",
      rows: [
        count(s.career_entries, TARGETS.careerEntries, "Career entries"),
        count(s.playbooks, TARGETS.playbooks, "Track playbooks"),
        count(s.tracks_covered, TARGETS.tracks, "Tracks covered by playbooks"),
        count(s.company_notes, TARGETS.companyNotes, "Company notes"),
      ],
      decision: supplyDecision(t2),
    },
    {
      title: "Test 2 · Did career entries lead to action?",
      rows: [
        {
          label: "Career follow-up responses",
          value: String(s.cf_responses),
          target: `${TARGETS.careerMinSample} minimum`,
          status: s.cf_responses >= TARGETS.careerMinSample ? "pass" : "not_yet",
        },
        sampleGated(
          "Named a concrete action",
          s.cf_named_action,
          s.cf_responses,
          TARGETS.careerMinSample,
          TARGETS.actionPass,
        ),
      ],
      decision: careerDecision(s.cf_responses, s.cf_named_action),
    },
    {
      title: "Both · Ask the author",
      rows: [
        { label: "Questions asked", value: String(s.questions_total), target: "—", status: "info" },
        ratioRow(
          "Answered within 48 hours",
          s.questions_answered_48h,
          s.questions_due,
          TARGETS.answered48h,
          "Of questions answered or older than 48 hours",
        ),
        {
          label: "Median time to answer",
          value:
            s.median_hours_to_answer === null
              ? "—"
              : `${Math.round(s.median_hours_to_answer * 10) / 10} h`,
          target: "—",
          status: "info",
        },
      ],
    },
    {
      title: "Funnel",
      rows: [
        {
          label: "Arrived (profile completed)",
          value: `${s.arrived} (${s.readers_arrived} readers)`,
          target: "—",
          status: "info",
        },
        {
          label: "Got value: courses",
          value: String(s.value_courses),
          target: "—",
          status: "info",
          note: "Viewed a course page with 3+ reviews, or got an answer",
        },
        { label: "Got value: career", value: String(s.value_career), target: "—", status: "info" },
        ratioRow(
          "Readers who came back on a later day (P1)",
          s.readers_came_back,
          s.readers_arrived,
          TARGETS.returnShare,
        ),
        ...Object.entries(s.by_programme)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([programme, p]): Row => ({
            label: `By programme: ${programme === "pgp_yl" ? "PGP YL" : programme === "pgp" ? "PGP" : "Alumni"}`,
            value: `${p.arrived} arrived · ${p.value_reached} got value · ${p.came_back} came back`,
            target: "—",
            status: "info",
          })),
      ],
    },
    {
      title: "PGP YL (P1)",
      rows: [
        count(s.yl_signups, TARGETS.ylSignups, "PGP YL sign-ups"),
        count(s.yl_questions, TARGETS.ylQuestions, "Questions from PGP YL to Co'27 authors"),
      ],
    },
    {
      title: "Fake doors: build chat (F8) or a people finder (F9)?",
      rows: [
        ratioRow(
          "“Request a chat” click-through (readers of entries)",
          s.chat_clickers,
          s.entry_readers,
          TARGETS.doorClickThrough,
        ),
        ratioRow(
          "Comment threads past 3 messages",
          s.threads_long,
          s.questions_total,
          TARGETS.longThreadShare,
        ),
        {
          label: "Asked for early chat access",
          value: String(s.chat_contacts),
          target: "—",
          status: "info",
        },
        ratioRow(
          "“Find people like me” click-through (career readers)",
          s.people_clickers,
          s.career_readers,
          TARGETS.doorClickThrough,
        ),
        count(s.people_contacts, TARGETS.peopleContacts, "Asked for early people-finder access"),
      ],
      decision: {
        tone: "neutral",
        text:
          (chatCtr >= TARGETS.doorClickThrough || longThreads >= TARGETS.longThreadShare
            ? "F8 chat: evidence is there, build it. "
            : "F8 chat: not yet. ") +
          (peopleCtr >= TARGETS.doorClickThrough && s.people_contacts >= TARGETS.peopleContacts
            ? "F9 people finder: evidence is there, build it."
            : "F9 people finder: not yet."),
      },
    },
    {
      title: "A10 · Alumni can sign in and contribute",
      rows: [
        count(
          s.outside_contributors_published,
          TARGETS.outsideContributors,
          "Contributors from outside ISB email who published",
        ),
      ],
    },
  ];
}

/** CSV of every row, for the course write-up. Quotes every cell. */
export function reportCsv(sections: Section[]): string {
  const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = [["section", "metric", "value", "target", "status", "note"].map(cell).join(",")];
  for (const section of sections) {
    for (const row of section.rows) {
      lines.push(
        [section.title, row.label, row.value, row.target, row.status, row.note ?? ""]
          .map(cell)
          .join(","),
      );
    }
    if (section.decision) {
      lines.push(
        [section.title, "Decision", section.decision.text, "", "", ""].map(cell).join(","),
      );
    }
  }
  return lines.join("\n") + "\n";
}
