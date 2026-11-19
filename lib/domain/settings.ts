// Dates and gates (docs/BUILD_PLAN.md 7), parsed from app_settings rows.
// A missing or malformed value falls back to its default rather than breaking
// a page: the defaults are the launch calendar.

import { z } from "zod";
import { APP_TIMEZONE } from "@/lib/constants/vocab";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const window = z.object({ start: isoDate, end: isoDate });

export const SETTING_SCHEMAS = {
  careers_write_open: z.boolean(),
  careers_read_open: z.boolean(),
  yl_read_open: z.boolean(),
  min_reviews_to_open_course: z.number().int().min(0).max(50),
  bid_term_label: z.string().regex(/^Term [1-8]$/),
  bid_window: window,
  post_bid_survey_window: window,
  career_followup_days: z.number().int().min(1).max(60),
  career_followup_deadline: isoDate,
  allowed_reader_domains: z.array(z.string().min(3)).min(1),
  post_bid_survey_cohort: z.string().min(2).max(20),
} as const;

type Schemas = typeof SETTING_SCHEMAS;
export type AppSettings = { [K in keyof Schemas]: z.infer<Schemas[K]> };

export const DEFAULT_SETTINGS: AppSettings = {
  careers_write_open: false,
  careers_read_open: false,
  yl_read_open: false,
  min_reviews_to_open_course: 0,
  bid_term_label: "Term 7",
  bid_window: { start: "2027-01-04", end: "2027-01-10" },
  post_bid_survey_window: { start: "2027-01-11", end: "2027-01-17" },
  career_followup_days: 14,
  career_followup_deadline: "2027-01-24",
  allowed_reader_domains: ["isb.edu"],
  post_bid_survey_cohort: "Co'27",
};

export function parseSettings(rows: { key: string; value: unknown }[]): AppSettings {
  const settings: AppSettings = { ...DEFAULT_SETTINGS };
  for (const { key, value } of rows) {
    if (!(key in SETTING_SCHEMAS)) continue;
    const name = key as keyof Schemas;
    const parsed = SETTING_SCHEMAS[name].safeParse(value);
    if (parsed.success) (settings as Record<string, unknown>)[name] = parsed.data;
  }
  return settings;
}

/** Today's date in India as YYYY-MM-DD. */
export function todayInIndia(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE }).format(now);
}

function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Days before bidding opens when the course list starts defaulting to the bid term. */
export const BID_SEASON_LEAD_DAYS = 7;

/**
 * Bid season: a week before bidding opens until it closes (plan 4.3: 28 Dec to
 * 10 Jan for the default dates). The course list defaults to the bid term then.
 */
export function isBidSeason(now: Date, settings: Pick<AppSettings, "bid_window">): boolean {
  const today = todayInIndia(now);
  return (
    today >= shiftDate(settings.bid_window.start, -BID_SEASON_LEAD_DAYS) &&
    today <= settings.bid_window.end
  );
}

/** May this person read course pages yet? PGP YL opens on its own date. */
export function coursesOpenTo(
  profile: { role: string; programme: string | null },
  settings: Pick<AppSettings, "yl_read_open">,
): boolean {
  if (profile.role === "moderator") return true;
  if (profile.programme === "pgp_yl") return settings.yl_read_open;
  return true;
}

/** Is this course shown to readers? Moderators always see it. */
export function courseVisible(
  course: { open_to_readers: boolean },
  reviewCount: number,
  settings: Pick<AppSettings, "min_reviews_to_open_course">,
  isModerator: boolean,
): boolean {
  if (isModerator) return true;
  if (!course.open_to_readers) return false;
  return reviewCount >= settings.min_reviews_to_open_course;
}

/**
 * A return visit (plan 6.4): an entry viewed on a later Indian calendar day
 * than sign-up. Returns the event's properties, or null if it is the sign-up day.
 */
export function returnVisit(
  now: Date,
  signedUpAt: string | null,
): { day: string; days_since_signup: number } | null {
  if (!signedUpAt) return null;
  const today = todayInIndia(now);
  const signupDay = todayInIndia(new Date(signedUpAt));
  if (today <= signupDay) return null;
  const days = Math.round((Date.parse(today) - Date.parse(signupDay)) / 86_400_000);
  return { day: today, days_since_signup: days };
}
