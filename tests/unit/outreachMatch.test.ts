import { describe, expect, it } from "vitest";
import { suggestMatches, type OutreachContact } from "@/lib/domain/outreachMatch";

const contact = (over: Partial<OutreachContact> & { full_name: string }): OutreachContact => ({
  id: over.full_name,
  cohort: "Co'26",
  email: null,
  claimed_by: null,
  ...over,
});

const person = { id: "p1", full_name: "Kiran Shah", email: "kiran.s@gmail.com", cohort: "Co'26" };

describe("suggestMatches", () => {
  it("puts an exact email match first", () => {
    const result = suggestMatches(person, [
      contact({ full_name: "Kiran Shah" }),
      contact({ full_name: "K Shah", email: "Kiran.S@gmail.com" }),
    ]);
    expect(result[0].reason).toBe("email");
    expect(result[0].contact.full_name).toBe("K Shah");
  });

  it("matches names with a middle name, different case or accents", () => {
    const result = suggestMatches(person, [
      contact({ full_name: "KIRAN R. SHAH" }),
      contact({ full_name: "Kirán Shah" }),
    ]);
    expect(result).toHaveLength(2);
  });

  it("does not suggest people who share nothing or only an initial", () => {
    expect(suggestMatches(person, [contact({ full_name: "Meera Das" })])).toEqual([]);
    expect(suggestMatches(person, [contact({ full_name: "K S" })])).toEqual([]);
  });

  it("ranks a same-cohort match above a different-cohort one", () => {
    const result = suggestMatches(person, [
      contact({ id: "other", full_name: "Kiran Shah", cohort: "Co'25" }),
      contact({ id: "same", full_name: "Kiran Shah", cohort: "Co'26" }),
    ]);
    expect(result.map((r) => r.contact.id)).toEqual(["same", "other"]);
  });

  it("treats a lone first name as weak evidence", () => {
    const result = suggestMatches({ ...person, full_name: "Kiran" }, [
      contact({ full_name: "Kiran Shah" }),
    ]);
    expect(result[0].score).toBeLessThanOrEqual(0.5);
  });

  it("skips contacts already claimed by someone else", () => {
    expect(
      suggestMatches(person, [contact({ full_name: "Kiran Shah", claimed_by: "someone-else" })]),
    ).toEqual([]);
  });

  it("returns at most three suggestions", () => {
    const many = Array.from({ length: 6 }, (_, i) =>
      contact({ id: `c${i}`, full_name: "Kiran Shah" }),
    );
    expect(suggestMatches(person, many)).toHaveLength(3);
  });
});
