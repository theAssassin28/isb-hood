// Pay and offer amounts are never collected (docs/BUILD_PLAN.md 5.2, 5.4).
// A soft check: it asks the writer before posting, and flags it if they post anyway.

const PATTERNS: RegExp[] = [
  /\b\d+(?:\.\d+)?\s*(?:lpa|lakhs?|lacs?|crores?|cr)\b/i, // 32 LPA, 18 lakh, 1.2 cr
  /\b\d+(?:\.\d+)?\s*L\b/, // 32L (capital L only, so "2l" in prose is left alone)
  /₹\s*\d/, // ₹40,00,000
  /\b(?:inr|rs\.?)\s*\d/i, // INR 4000000, Rs. 40 lakh
  /\bctc\b/i,
  /\b(?:salary|stipend|package|base pay|joining bonus)\s*(?:of|was|is|:)?\s*(?:about|around|~)?\s*[\d₹]/i,
];

export function mentionsPayFigures(text: string): boolean {
  return PATTERNS.some((pattern) => pattern.test(text));
}

export const PAY_FIGURE_WARNING =
  "This looks like it mentions pay or an offer amount. ISB Hood does not collect those. Remove it, or post anyway and a moderator will check it.";
