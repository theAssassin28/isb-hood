import { describe, expect, it } from "vitest";
import { buildDigests, type DigestComment, type DigestReview } from "@/lib/email/digest";

const at = (h: number) => `2026-12-10T${String(h).padStart(2, "0")}:00:00Z`;
const c = (
  over: Partial<DigestComment> & Pick<DigestComment, "id" | "author_id">,
): DigestComment => ({
  entry_id: "review-1",
  parent_id: null,
  body: "text",
  created_at: at(9),
  ...over,
});

const reviews = new Map<string, DigestReview>([
  ["review-1", { author_id: "writer", visibility: "named", course_title: "Pricing" }],
  ["review-2", { author_id: "anon-writer", visibility: "anonymous", course_title: "Valuation" }],
]);
const names = new Map([
  ["writer", "Asha Rao, Co'26"],
  ["anon-writer", "Kiran Shah, Co'26"],
  ["reader", "Ravi Menon, Co'27"],
]);
const url = (id: string) => `/reply/${id}`;

describe("buildDigests", () => {
  it("tells the review's author about other people's comments, in order", () => {
    const digests = buildDigests({
      comments: [
        c({ id: "q2", author_id: "reader", created_at: at(11), body: "second" }),
        c({ id: "q1", author_id: "reader", created_at: at(9), body: "first" }),
      ],
      reviews,
      askers: new Map(),
      names,
      url,
    });
    expect(digests.get("writer")?.map((i) => i.body)).toEqual(["first", "second"]);
    expect(digests.get("writer")?.[0]).toMatchObject({
      kind: "comment",
      commenter: "Ravi Menon, Co'27",
      url: "/reply/q1",
    });
  });

  it("tells the asker when the author answers, and not the author about their own reply", () => {
    const digests = buildDigests({
      comments: [c({ id: "a1", author_id: "writer", parent_id: "q1" })],
      reviews,
      askers: new Map([["q1", "reader"]]),
      names,
      url,
    });
    expect(digests.has("writer")).toBe(false);
    expect(digests.get("reader")?.[0]).toMatchObject({
      kind: "answer",
      answerer: "Asha Rao, Co'26",
      url: "/reply/q1",
    });
  });

  it("never names the author of an anonymous review", () => {
    const digests = buildDigests({
      comments: [c({ id: "a1", entry_id: "review-2", author_id: "anon-writer", parent_id: "q1" })],
      reviews,
      askers: new Map([["q1", "reader"]]),
      names,
      url,
    });
    const item = digests.get("reader")?.[0];
    expect(item?.kind === "answer" && item.answerer).toBe("The author");
    expect(JSON.stringify(digests.get("reader"))).not.toContain("Kiran");
  });

  it("skips comments on reviews that are gone", () => {
    expect(
      buildDigests({
        comments: [c({ id: "x", author_id: "reader", entry_id: "gone" })],
        reviews,
        askers: new Map(),
        names,
        url,
      }).size,
    ).toBe(0);
  });
});
