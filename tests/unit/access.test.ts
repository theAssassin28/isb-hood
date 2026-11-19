import { describe, expect, it } from "vitest";
import {
  afterOnboardingPath,
  decideAccess,
  isReaderDomain,
  normalizeCode,
  normalizeEmail,
  safeCampaign,
  safeCourseId,
  shellFor,
} from "@/lib/auth/access";

const allowed = ["isb.edu"];

describe("isReaderDomain", () => {
  it("accepts an ISB address regardless of case", () => {
    expect(isReaderDomain("Asha_Rao@ISB.edu", allowed)).toBe(true);
  });

  it("rejects look-alike domains", () => {
    for (const email of [
      "x@gmail.com",
      "x@isb.edu.evil.com",
      "x@notisb.edu",
      "x@sub.isb.edu",
      "isb.edu@gmail.com",
      "x@",
      "",
    ]) {
      expect(isReaderDomain(email, allowed), email).toBe(false);
    }
  });

  it("accepts a second domain once it is listed", () => {
    expect(isReaderDomain("x@pgpyl.isb.edu", ["isb.edu", "pgpyl.isb.edu"])).toBe(true);
  });
});

describe("decideAccess", () => {
  const base = { allowedDomains: allowed, isReturningContributor: false };

  it("gives an ISB address a reader account whichever door it used", () => {
    expect(decideAccess({ ...base, email: "a@isb.edu", intent: "reader" }).kind).toBe("isb");
    expect(decideAccess({ ...base, email: "a@isb.edu", intent: "contributor" }).kind).toBe("isb");
  });

  it("lets a non-ISB address in only through the contributor link", () => {
    expect(decideAccess({ ...base, email: "a@gmail.com", intent: "contributor" }).kind).toBe(
      "contributor",
    );
    expect(decideAccess({ ...base, email: "a@gmail.com", intent: "reader" }).kind).toBe("reject");
  });

  it("lets a returning contributor back in from the ordinary sign-in page", () => {
    expect(
      decideAccess({
        email: "a@gmail.com",
        intent: "reader",
        allowedDomains: allowed,
        isReturningContributor: true,
      }).kind,
    ).toBe("contributor");
  });
});

describe("shellFor", () => {
  const done = "2026-11-20T10:00:00Z";

  it("sends anyone without a finished profile to onboarding", () => {
    expect(
      shellFor({
        account_type: "isb",
        verification_status: "not_required",
        profile_completed_at: null,
      }),
    ).toBe("onboarding");
  });

  it("gives ISB accounts and verified contributors the full app", () => {
    expect(
      shellFor({
        account_type: "isb",
        verification_status: "not_required",
        profile_completed_at: done,
      }),
    ).toBe("full");
    expect(
      shellFor({
        account_type: "contributor",
        verification_status: "verified",
        profile_completed_at: done,
      }),
    ).toBe("full");
  });

  it("keeps unverified and rejected contributors out", () => {
    expect(
      shellFor({
        account_type: "contributor",
        verification_status: "pending",
        profile_completed_at: done,
      }),
    ).toBe("limited");
    expect(
      shellFor({
        account_type: "contributor",
        verification_status: "rejected",
        profile_completed_at: done,
      }),
    ).toBe("rejected");
  });
});

describe("values carried through sign-in", () => {
  const id = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";

  it("keeps a course id only if it is a uuid", () => {
    expect(safeCourseId(id)).toBe(id);
    expect(safeCourseId(id.toUpperCase())).toBe(id);
    for (const bad of ["", "abc", "//evil.com", `${id}/../admin`, null, 42]) {
      expect(safeCourseId(bad), String(bad)).toBeNull();
    }
  });

  it("reduces a campaign label to plain characters", () => {
    expect(safeCampaign("Co26-Term7_wa")).toBe("co26-term7_wa");
    expect(safeCampaign("<script>alert(1)</script>")).toBe("scriptalert1script");
    expect(safeCampaign("   ")).toBeNull();
    expect(safeCampaign("x".repeat(100))).toHaveLength(40);
  });

  it("sends a contributor with a course to the review form, otherwise home", () => {
    expect(afterOnboardingPath(id)).toBe(`/write/course-review?course=${id}`);
    expect(afterOnboardingPath(null)).toBe("/");
  });
});

describe("sign-in by emailed code", () => {
  it("normalises an email address", () => {
    expect(normalizeEmail("  Asha_Rao@ISB.edu ")).toBe("asha_rao@isb.edu");
    for (const bad of [
      "",
      "asha",
      "asha@",
      "@isb.edu",
      "a b@isb.edu",
      null,
      7,
      `${"a".repeat(250)}@isb.edu`,
    ]) {
      expect(normalizeEmail(bad), String(bad)).toBeNull();
    }
  });

  it("accepts the code with spaces, digits only", () => {
    expect(normalizeCode("123456")).toBe("123456");
    expect(normalizeCode(" 123 456 ")).toBe("123456");
    for (const bad of ["12345", "12a456", "", null, "12345678901"]) {
      expect(normalizeCode(bad), String(bad)).toBeNull();
    }
  });

  it("keeps the reader door to ISB addresses, whatever the case", () => {
    expect(isReaderDomain(normalizeEmail("RAVI@ISB.EDU")!, ["isb.edu"])).toBe(true);
    expect(isReaderDomain(normalizeEmail("ravi@outlook.com")!, ["isb.edu"])).toBe(false);
  });
});
