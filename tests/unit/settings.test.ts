import { describe, expect, it } from "vitest";
import {
  courseVisible,
  coursesOpenTo,
  DEFAULT_SETTINGS,
  isBidSeason,
  parseSettings,
  todayInIndia,
} from "@/lib/domain/settings";

describe("parseSettings", () => {
  it("reads valid values and keeps defaults for missing ones", () => {
    const s = parseSettings([
      { key: "yl_read_open", value: true },
      { key: "min_reviews_to_open_course", value: 3 },
    ]);
    expect(s.yl_read_open).toBe(true);
    expect(s.min_reviews_to_open_course).toBe(3);
    expect(s.bid_term_label).toBe("Term 7");
  });

  it("falls back to the default when a value is malformed, and ignores unknown keys", () => {
    const s = parseSettings([
      { key: "bid_window", value: { start: "next week" } },
      { key: "min_reviews_to_open_course", value: -1 },
      { key: "surprise", value: 1 },
    ]);
    expect(s).toEqual(DEFAULT_SETTINGS);
  });
});

describe("isBidSeason", () => {
  const at = (iso: string) => isBidSeason(new Date(iso), DEFAULT_SETTINGS);

  it("starts a week before bidding opens, in Indian time", () => {
    // 28 Dec 00:30 IST is still 27 Dec in UTC.
    expect(at("2026-12-27T18:29:00Z")).toBe(false);
    expect(at("2026-12-27T19:00:00Z")).toBe(true);
  });

  it("ends when bidding closes", () => {
    expect(at("2027-01-10T18:00:00Z")).toBe(true); // 23:30 IST on 10 Jan
    expect(at("2027-01-10T18:31:00Z")).toBe(false); // 00:01 IST on 11 Jan
  });

  it("formats today in India", () => {
    expect(todayInIndia(new Date("2026-12-31T19:00:00Z"))).toBe("2027-01-01");
  });
});

describe("gates", () => {
  it("keeps PGP YL out until their date, but never moderators", () => {
    expect(coursesOpenTo({ role: "reader", programme: "pgp_yl" }, { yl_read_open: false })).toBe(
      false,
    );
    expect(coursesOpenTo({ role: "reader", programme: "pgp_yl" }, { yl_read_open: true })).toBe(
      true,
    );
    expect(coursesOpenTo({ role: "reader", programme: "pgp" }, { yl_read_open: false })).toBe(true);
    expect(coursesOpenTo({ role: "moderator", programme: "pgp_yl" }, { yl_read_open: false })).toBe(
      true,
    );
  });

  it("hides thin or switched-off courses from readers only", () => {
    const open = { open_to_readers: true };
    const settings = { min_reviews_to_open_course: 3 };
    expect(courseVisible(open, 2, settings, false)).toBe(false);
    expect(courseVisible(open, 3, settings, false)).toBe(true);
    expect(courseVisible({ open_to_readers: false }, 9, settings, false)).toBe(false);
    expect(courseVisible({ open_to_readers: false }, 0, settings, true)).toBe(true);
  });
});

import { returnVisit } from "@/lib/domain/settings";

describe("returnVisit", () => {
  it("is nothing on the sign-up day, in Indian time", () => {
    // Signed up 23:00 IST on 10 Dec; 23:30 IST the same day is not a return.
    expect(returnVisit(new Date("2026-12-10T18:00:00Z"), "2026-12-10T17:30:00Z")).toBeNull();
  });

  it("counts any later Indian calendar day, even an hour later across midnight", () => {
    expect(returnVisit(new Date("2026-12-10T18:45:00Z"), "2026-12-10T17:30:00Z")).toEqual({
      day: "2026-12-11",
      days_since_signup: 1,
    });
    expect(
      returnVisit(new Date("2026-12-20T05:00:00Z"), "2026-12-10T05:00:00Z")?.days_since_signup,
    ).toBe(10);
  });

  it("needs a sign-up time", () => {
    expect(returnVisit(new Date(), null)).toBeNull();
  });
});
