import { describe, expect, it } from "vitest";
import * as vocab from "@/lib/constants/vocab";

describe("vocabularies", () => {
  it("have unique stored values in every list", () => {
    for (const [name, list] of Object.entries(vocab)) {
      if (!Array.isArray(list)) continue;
      const values = list.map((o) => (typeof o === "string" ? o : o.value));
      expect(new Set(values).size, name).toBe(values.length);
    }
  });

  it("cover the six tracks in the requirements", () => {
    expect(vocab.TRACKS).toHaveLength(6);
  });
});
