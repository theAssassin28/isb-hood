// Suggests which outreach contact a pending contributor probably is.
// A suggestion only: a moderator makes the call (docs/BUILD_PLAN.md, 4.10).

export type OutreachContact = {
  id: string;
  full_name: string;
  cohort: string | null;
  email: string | null;
  claimed_by: string | null;
};

export type MatchSuggestion = {
  contact: OutreachContact;
  /** 0 to 1. */
  score: number;
  reason: "email" | "name";
};

function tokens(name: string): string[] {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function nameScore(a: string, b: string): number {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared += 1;
  // Share of the shorter name that is covered, so "Kiran Shah" matches "Kiran R Shah".
  return shared / Math.min(ta.size, tb.size);
}

export function suggestMatches(
  person: { id: string; full_name: string | null; email: string; cohort: string | null },
  contacts: readonly OutreachContact[],
  limit = 3,
): MatchSuggestion[] {
  const email = person.email.trim().toLowerCase();
  const suggestions: MatchSuggestion[] = [];

  for (const contact of contacts) {
    if (contact.claimed_by && contact.claimed_by !== person.id) continue;

    if (contact.email && contact.email.trim().toLowerCase() === email) {
      suggestions.push({ contact, score: 1, reason: "email" });
      continue;
    }

    let score = nameScore(person.full_name ?? "", contact.full_name);
    if (score < 0.5) continue;
    // A single shared token (a common first name) is weak evidence on its own.
    if (score === 1 && tokens(person.full_name ?? "").length === 1) score = 0.5;
    if (person.cohort && contact.cohort && person.cohort !== contact.cohort) score *= 0.6;
    suggestions.push({ contact, score: Math.min(score, 0.95), reason: "name" });
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, limit);
}
