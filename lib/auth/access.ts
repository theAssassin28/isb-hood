// Pure rules for who gets in and what they see (docs/BUILD_PLAN.md, section 3).
// No I/O here, so every branch is unit-tested in tests/unit/access.test.ts.

export type AccountType = "isb" | "contributor";
export type VerificationStatus = "not_required" | "pending" | "verified" | "rejected";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  programme: "pgp" | "pgp_yl" | "alum" | null;
  cohort: string | null;
  background_function: string | null;
  background_industry: string | null;
  years_experience_band: string | null;
  target_track: string | null;
  role: "reader" | "moderator";
  account_type: AccountType;
  verification_status: VerificationStatus;
  source: string | null;
  notify_pref: "instant" | "daily" | "off";
  profile_completed_at: string | null;
  deleted_at: string | null;
};

export const DEFAULT_READER_DOMAINS = ["isb.edu"];

export function emailDomain(email: string): string {
  return email.trim().toLowerCase().split("@").pop() ?? "";
}

/** Exact domain match only: "student.isb.edu" is not "isb.edu" unless it is listed. */
export function isReaderDomain(email: string, allowedDomains: readonly string[]): boolean {
  const domain = emailDomain(email);
  return domain !== "" && allowedDomains.some((d) => d.trim().toLowerCase() === domain);
}

export type SignInIntent = "reader" | "contributor";

export type AccessDecision =
  /** ISB email: full reader account. */
  | { kind: "isb" }
  /** Outside ISB, arrived by a contributor link or already registered as one. */
  | { kind: "contributor" }
  /** Outside ISB and not from a contributor link: no account. */
  | { kind: "reject" };

/**
 * Decided on the server once the person has typed the emailed code. The email
 * on that verified session is the only thing trusted here.
 */
export function decideAccess(args: {
  email: string;
  intent: SignInIntent;
  allowedDomains: readonly string[];
  /** True when this person completed contributor onboarding on an earlier visit. */
  isReturningContributor: boolean;
}): AccessDecision {
  if (isReaderDomain(args.email, args.allowedDomains)) return { kind: "isb" };
  if (args.intent === "contributor" || args.isReturningContributor) return { kind: "contributor" };
  return { kind: "reject" };
}

export type Shell =
  /** Profile form not finished. */
  | "onboarding"
  /** Contributor awaiting verification: sees only their own work. */
  | "limited"
  /** Contributor a moderator turned down. */
  | "rejected"
  /** ISB account or verified contributor. */
  | "full";

export function shellFor(
  profile: Pick<Profile, "account_type" | "verification_status" | "profile_completed_at">,
): Shell {
  if (!profile.profile_completed_at) return "onboarding";
  if (profile.account_type === "isb" || profile.verification_status === "verified") return "full";
  if (profile.verification_status === "rejected") return "rejected";
  return "limited";
}

/** Only same-site course ids are carried through sign-in; anything else is dropped. */
export function safeCourseId(value: unknown): string | null {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value.toLowerCase()
    : null;
}

/** Campaign labels come from a URL: keep them short and plain. */
export function safeCampaign(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 40);
  return cleaned === "" ? null : cleaned;
}

/** Where a contributor lands once their profile is complete. */
export function afterOnboardingPath(courseId: string | null): string {
  return courseId ? `/write/course-review?course=${courseId}` : "/";
}

/**
 * A same-site path to return to after sign-in (from an email link), or null.
 * Only plain paths: no scheme, no host, no protocol-relative "//", no backslashes.
 */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 200) return null;
  if (!/^\/[A-Za-z0-9/_\-?=&#.%]*$/.test(value)) return null;
  if (value.startsWith("//") || value.includes("..")) return null;
  return value;
}

/** Where someone goes after signing in: back to the email link, the review form, or home. */
export function landingPath(intent: { next: string | null; course: string | null }): string {
  return intent.next ?? afterOnboardingPath(intent.course);
}

/** Lower-cased, trimmed email, or null if it does not look like one. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

/** The code from the sign-in email: digits only (Supabase sends six). */
export function normalizeCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.replace(/\s+/g, "");
  return /^\d{6,10}$/.test(code) ? code : null;
}
