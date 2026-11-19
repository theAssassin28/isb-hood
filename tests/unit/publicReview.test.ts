import { describe, expect, it } from "vitest";
import { PUBLIC_REVIEW_COLUMNS, toPublicReview } from "@/lib/domain/publicReview";

describe("public reviews", () => {
  it("never select the author's id", () => {
    const columns = PUBLIC_REVIEW_COLUMNS.split(",").map((c) => c.trim());
    expect(columns).not.toContain("author_id");
    expect(columns).not.toContain("on_behalf_of_name");
  });

  it("drop anything identifying that reaches the mapper anyway", () => {
    const review = toPublicReview({
      id: "r1",
      author_id: "user-123",
      email: "asha@isb.edu",
      on_behalf_of_name: "Asha Rao",
      author_display: "Verified Co'26 student",
      visibility: "anonymous",
    });
    const serialised = JSON.stringify(review);
    expect(serialised).not.toContain("user-123");
    expect(serialised).not.toContain("asha@isb.edu");
    expect(serialised).not.toContain("Asha Rao");
    expect(review).not.toHaveProperty("author_id");
    expect(review.author_display).toBe("Verified Co'26 student");
  });
});
