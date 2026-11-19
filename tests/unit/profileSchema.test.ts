import { describe, expect, it } from "vitest";
import { profileSchema } from "@/lib/schemas/profile";

const valid = {
  full_name: "Asha Rao",
  programme: "pgp",
  cohort: "Co'27",
  background_function: "consulting",
  background_industry: "bfsi",
  years_experience_band: "3-5",
  target_track: "product",
  heard_from: "friend",
};

describe("profileSchema", () => {
  it("accepts a complete profile and trims the name", () => {
    const result = profileSchema.parse({ ...valid, full_name: "  Asha Rao  " });
    expect(result.full_name).toBe("Asha Rao");
  });

  it("rejects values outside the vocabularies, with a readable message", () => {
    const result = profileSchema.safeParse({ ...valid, target_track: "astronaut" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Choose a track");
  });

  it("requires every field", () => {
    for (const field of Object.keys(valid)) {
      const copy: Record<string, string> = { ...valid };
      delete copy[field];
      expect(profileSchema.safeParse(copy).success, field).toBe(false);
    }
  });
});
