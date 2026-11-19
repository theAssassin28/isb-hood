import { describe, expect, it } from "vitest";
import { MIRRORED_EVENTS, posthogPayload } from "@/lib/domain/posthogPayload";
import { surveyEmail } from "@/lib/email/templates";

describe("PostHog mirror", () => {
  it("mirrors exactly the ten spec events, not diagnostics", () => {
    expect(MIRRORED_EVENTS.size).toBe(10);
    expect(MIRRORED_EVENTS.has("form_step_completed")).toBe(false);
    expect(MIRRORED_EVENTS.has("survey_shown")).toBe(false);
  });

  it("sends the user id as the only identity, in the capture API's shape", () => {
    const body = posthogPayload({
      apiKey: "phc_test",
      userId: "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b",
      name: "course_page_viewed",
      props: { course_id: "c1", review_count: 3 },
      at: new Date("2027-01-05T10:00:00Z"),
    });
    expect(body).toEqual({
      api_key: "phc_test",
      event: "course_page_viewed",
      distinct_id: "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b",
      properties: { course_id: "c1", review_count: 3, source: "isb-hood-server" },
      timestamp: "2027-01-05T10:00:00.000Z",
    });
  });
});

describe("survey emails", () => {
  it("say a reminder is the last one", () => {
    const first = surveyEmail({ survey: "post_bid", reminder: false, url: "u", prefsUrl: "p" });
    const second = surveyEmail({ survey: "post_bid", reminder: true, url: "u", prefsUrl: "p" });
    expect(first.subject).toBe("Two questions about your bids");
    expect(second.subject).toBe("Reminder: two questions about your bids");
    expect(first.text).not.toContain("only reminder");
    expect(second.text).toContain("This is the only reminder");
  });

  it("word the career follow-up differently", () => {
    expect(
      surveyEmail({ survey: "career_followup", reminder: false, url: "u", prefsUrl: "p" }).subject,
    ).toBe("Did a career entry help?");
  });
});
