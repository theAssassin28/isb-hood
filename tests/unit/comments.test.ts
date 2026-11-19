import { describe, expect, it } from "vitest";
import { landingPath, safeNextPath } from "@/lib/auth/access";
import { mentionsPayFigures } from "@/lib/domain/payFigures";
import {
  buildThreads,
  hoursToAnswer,
  waitingForMe,
  type PublicComment,
} from "@/lib/domain/threads";

let n = 0;
const comment = (over: Partial<PublicComment>): PublicComment => {
  n += 1;
  return {
    id: `c${n}`,
    entry_type: "course_review",
    entry_id: "e1",
    parent_id: null,
    body: "text",
    created_at: `2026-12-01T10:${String(n).padStart(2, "0")}:00Z`,
    first_reply_at: null,
    is_entry_author: false,
    author_display: "Ravi Menon, Co'27",
    is_mine: false,
    ...over,
  };
};

describe("buildThreads", () => {
  it("groups replies under their question, oldest first, per entry", () => {
    const q1 = comment({ id: "q1" });
    const q2 = comment({ id: "q2", entry_id: "e2" });
    const r1 = comment({ id: "r1", parent_id: "q1" });
    const r2 = comment({ id: "r2", parent_id: "q1" });
    const threads = buildThreads([r2, q2, r1, q1]);
    expect(threads.get("e1")).toEqual([{ question: q1, replies: [r1, r2] }]);
    expect(threads.get("e2")).toEqual([{ question: q2, replies: [] }]);
  });

  it("drops replies whose question was removed", () => {
    const orphan = comment({ parent_id: "gone" });
    expect(buildThreads([orphan]).size).toBe(0);
  });
});

describe("waitingForMe", () => {
  it("lists unanswered questions from other people", () => {
    const threads = [
      { question: comment({ id: "a" }), replies: [] },
      { question: comment({ id: "b", first_reply_at: "2026-12-02T00:00:00Z" }), replies: [] },
      { question: comment({ id: "c", is_mine: true }), replies: [] },
    ];
    expect(waitingForMe(threads).map((t) => t.question.id)).toEqual(["a"]);
  });
});

describe("hoursToAnswer", () => {
  it("is hours to one decimal, never negative", () => {
    expect(hoursToAnswer("2026-12-01T10:00:00Z", new Date("2026-12-02T16:30:00Z"))).toBe(30.5);
    expect(hoursToAnswer("2026-12-01T10:00:00Z", new Date("2026-12-01T09:00:00Z"))).toBe(0);
  });
});

describe("mentionsPayFigures", () => {
  it("catches common ways of writing pay", () => {
    for (const text of [
      "They offered 32 LPA",
      "base was 28L plus bonus",
      "around ₹40,00,000",
      "INR 3500000 fixed",
      "Rs. 18 lakh",
      "1.2 cr total",
      "the CTC was decent",
      "salary of 25",
      "joining bonus: ₹2L",
    ]) {
      expect(mentionsPayFigures(text), text).toBe(true);
    }
  });

  it("leaves ordinary course talk alone", () => {
    for (const text of [
      "Term 7 has 4 sub-assignments",
      "Took it in 2026 with 3 friends",
      "learning value is 5 of 5",
      "two lectures a week, 90 minutes each",
      "the package of readings is long",
    ]) {
      expect(mentionsPayFigures(text), text).toBe(false);
    }
  });
});

describe("safeNextPath", () => {
  it("keeps plain same-site paths", () => {
    expect(safeNextPath("/reply/3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b")).toBe(
      "/reply/3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b",
    );
    expect(safeNextPath("/courses?term=all")).toBe("/courses?term=all");
  });

  it("refuses anything that could leave the site", () => {
    for (const bad of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "evil.com",
      "/../admin",
      "/x y",
      "javascript:alert(1)",
      `/${"a".repeat(300)}`,
      null,
    ]) {
      expect(safeNextPath(bad), String(bad)).toBeNull();
    }
  });

  it("is where sign-in lands when present", () => {
    expect(landingPath({ next: "/reply/x", course: "c" })).toBe("/reply/x");
    expect(landingPath({ next: null, course: null })).toBe("/");
  });
});
