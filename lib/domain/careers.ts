// Career entries as readers get them from career_entries_public, plus the rules
// that work on them: titles, "Like me" matching (plan 6.3), list filters, and
// the track pathway that lines up every playbook for one track by stage.
// Shared by server and client code.

import {
  COMPANY_TYPES,
  FUNCTIONS,
  INDUSTRIES,
  NUMBER_BANDS,
  TERM_BUCKETS,
  TRACKS,
  WHAT_MATTERED,
} from "@/lib/constants/vocab";
import {
  companyNoteSchema,
  playbookSchema,
  type CompanyNoteBody,
  type PlaybookBody,
  type StageKey,
} from "@/lib/schemas/careerEntry";

type Base = {
  id: string;
  track: string | null;
  company: string | null;
  from_function: string | null;
  from_industry: string | null;
  from_years_band: string | null;
  published_at: string | null;
  is_edited: boolean;
  open_to_questions: boolean;
  /** "Asha Rao, Co'26" or "Verified Co'26 student". Never an id or email. */
  author_display: string;
  author_cohort: string | null;
  /** Background used for "Like me": the entry's "from", or the author's own for notes. */
  match_function: string | null;
  match_industry: string | null;
  entered_by_team: boolean;
  is_mine: boolean;
};

export type PublicPlaybook = Base & { type: "playbook"; body: PlaybookBody };
export type PublicCompanyNote = Base & { type: "company_note"; body: CompanyNoteBody };
export type PublicCareerEntry = PublicPlaybook | PublicCompanyNote;

/** Columns read from the view. `author_id` is deliberately not one of them. */
export const PUBLIC_CAREER_COLUMNS =
  "id, type, track, company, from_function, from_industry, from_years_band, body, " +
  "published_at, is_edited, open_to_questions, author_display, author_cohort, " +
  "match_function, match_industry, entered_by_team, is_mine";

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : null);

/** Allowlisted mapping; an entry whose body no longer parses is dropped, not shown broken. */
export function toPublicCareerEntry(row: Record<string, unknown>): PublicCareerEntry | null {
  const base: Base = {
    id: String(row.id ?? ""),
    track: str(row.track),
    company: str(row.company),
    from_function: str(row.from_function),
    from_industry: str(row.from_industry),
    from_years_band: str(row.from_years_band),
    published_at: str(row.published_at),
    is_edited: row.is_edited === true,
    open_to_questions: row.open_to_questions !== false,
    author_display: str(row.author_display) ?? "ISB student",
    author_cohort: str(row.author_cohort),
    match_function: str(row.match_function),
    match_industry: str(row.match_industry),
    entered_by_team: row.entered_by_team === true,
    is_mine: row.is_mine === true,
  };
  if (row.type === "playbook") {
    const body = playbookSchema.safeParse(row.body);
    return body.success ? { ...base, type: "playbook", body: body.data } : null;
  }
  if (row.type === "company_note") {
    const body = companyNoteSchema.safeParse(row.body);
    return body.success ? { ...base, type: "company_note", body: body.data } : null;
  }
  return null;
}

// ------------------------------------------------------------------ labels
const labelFrom =
  (list: readonly { value: string; label: string }[]) =>
  (value: string | null | undefined): string =>
    list.find((o) => o.value === value)?.label ?? "Other";

export const trackLabel = labelFrom(TRACKS);
export const functionLabel = labelFrom(FUNCTIONS);
export const industryLabel = labelFrom(INDUSTRIES);
export const companyTypeLabel = labelFrom(COMPANY_TYPES);
export const matteredLabel = labelFrom(WHAT_MATTERED);
export const stageLabel = labelFrom(TERM_BUCKETS);

/** Short track name for headings ("General management" rather than the long label). */
export function trackShort(track: string | null): string {
  return track === "general_management" ? "General management" : trackLabel(track);
}

/** "Consulting → Product, Co'26" for a playbook; "Amazon · Product Manager · 2026" for a note. */
export function careerTitle(entry: PublicCareerEntry): string {
  if (entry.type === "playbook") {
    const from = functionLabel(entry.from_function).split(" / ")[0];
    return `${from} → ${trackShort(entry.track)}`;
  }
  return `${entry.body.company} · ${entry.body.role} · ${entry.body.year}`;
}

export function careerSubtitle(entry: PublicCareerEntry): string {
  if (entry.type === "playbook") {
    const where = entry.body.to.company || companyTypeLabel(entry.body.to.company_type);
    return `${entry.body.to.role} at ${where} · from ${industryLabel(entry.from_industry)}, ${entry.from_years_band} years`;
  }
  const rel = { interviewed: "Interviewed", interned: "Interned", joined: "Joined" }[
    entry.body.relationship
  ];
  return `${rel} · ${trackShort(entry.track)}`;
}

// ---------------------------------------------------------------- matching
export type Reader = {
  background_function: string | null;
  background_industry: string | null;
  target_track: string | null;
};

/** Plan 6.3: same pre-MBA function or industry. */
export function matchesBackground(entry: PublicCareerEntry, reader: Reader): boolean {
  return (
    (!!reader.background_function && entry.match_function === reader.background_function) ||
    (!!reader.background_industry && entry.match_industry === reader.background_industry)
  );
}

export function matchesTrack(entry: PublicCareerEntry, reader: Reader): boolean {
  return !!reader.target_track && entry.track === reader.target_track;
}

/** Why this entry is "like me", for the card. Null when it is not. */
export function matchReason(entry: PublicCareerEntry, reader: Reader): string | null {
  if (reader.background_function && entry.match_function === reader.background_function)
    return `Also from ${functionLabel(reader.background_function).toLowerCase()}`;
  if (reader.background_industry && entry.match_industry === reader.background_industry)
    return `Also from ${industryLabel(reader.background_industry)}`;
  return null;
}

// ----------------------------------------------------------------- filters
export type CareerFilters = {
  type: "playbook" | "company_note" | null;
  track: string | null;
  company: string | null;
  background: string | null;
  likeMe: boolean;
};

export type CareerFilterName = "type" | "track" | "company" | "background" | "like_me";

const pick = (v: unknown) => (typeof v === "string" && v !== "" ? v : null);

export function parseCareerFilters(query: Record<string, string | string[] | undefined>) {
  const one = (k: string) => pick(Array.isArray(query[k]) ? query[k]?.[0] : query[k]);
  const type = one("type");
  const track = one("track");
  const background = one("background");
  return {
    type: type === "playbook" || type === "company_note" ? type : null,
    track: TRACKS.some((t) => t.value === track) ? track : null,
    company: one("company")?.slice(0, 80) ?? null,
    background: FUNCTIONS.some((f) => f.value === background) ? background : null,
    likeMe: one("like") === "1",
  } satisfies CareerFilters;
}

export function activeFilterNames(f: CareerFilters): CareerFilterName[] {
  const out: CareerFilterName[] = [];
  if (f.type) out.push("type");
  if (f.track) out.push("track");
  if (f.company) out.push("company");
  if (f.background) out.push("background");
  if (f.likeMe) out.push("like_me");
  return out;
}

/** Filter, then sort: "Like me" puts function matches first, then track matches (plan 6.3). */
export function filterCareerEntries(
  entries: PublicCareerEntry[],
  f: CareerFilters,
  reader: Reader,
): PublicCareerEntry[] {
  const company = f.company?.toLowerCase();
  const list = entries.filter(
    (e) =>
      (!f.type || e.type === f.type) &&
      (!f.track || e.track === f.track) &&
      (!company || (e.company ?? "").toLowerCase().includes(company)) &&
      (!f.background || e.match_function === f.background) &&
      (!f.likeMe || matchesBackground(e, reader)),
  );
  const newest = (a: PublicCareerEntry, b: PublicCareerEntry) =>
    (b.published_at ?? "").localeCompare(a.published_at ?? "");
  if (!f.likeMe) return list.sort(newest);
  const score = (e: PublicCareerEntry) =>
    (e.match_function === reader.background_function ? 2 : 0) + (matchesTrack(e, reader) ? 1 : 0);
  return list.sort((a, b) => score(b) - score(a) || newest(a, b));
}

/** Companies named in live entries, for the company filter. */
export function companiesIn(entries: PublicCareerEntry[]): string[] {
  return [...new Set(entries.map((e) => e.company).filter((c): c is string => !!c))].sort();
}

// ----------------------------------------------------------------- pathway
export type StageLine = {
  entryId: string;
  text: string;
  /** "Consulting, 3-5 years" */
  from: string;
  author: string;
};

export type TrackPathway = {
  track: string;
  playbooks: PublicPlaybook[];
  notes: PublicCompanyNote[];
  /** Every playbook's line for each stage, in stage order. */
  stages: { key: StageKey; label: string; lines: StageLine[] }[];
  /** What mattered most, by how many playbooks picked it. */
  mattered: { value: string; label: string; count: number }[];
  /** Typical (median) band for each step of the funnel. */
  funnel: { label: string; band: string }[];
  /** Pre-MBA backgrounds people came from. */
  backgrounds: { label: string; count: number }[];
  latestSafeStart: StageLine[];
  mistakes: StageLine[];
  companies: string[];
};

function medianBand(bands: string[]): string {
  if (bands.length === 0) return "–";
  const order = NUMBER_BANDS as readonly string[];
  const sorted = bands.map((b) => order.indexOf(b)).sort((a, b) => a - b);
  return order[sorted[Math.floor((sorted.length - 1) / 2)]] ?? "–";
}

export function buildPathway(track: string, entries: PublicCareerEntry[]): TrackPathway {
  const playbooks = entries.filter(
    (e): e is PublicPlaybook => e.type === "playbook" && e.track === track,
  );
  const notes = entries.filter(
    (e): e is PublicCompanyNote => e.type === "company_note" && e.track === track,
  );
  const line = (p: PublicPlaybook, text: string): StageLine => ({
    entryId: p.id,
    text,
    from: `${functionLabel(p.from_function).split(" / ")[0]}, ${p.from_years_band} years`,
    author: p.author_display,
  });

  const stages = TERM_BUCKETS.map((bucket) => ({
    key: bucket.value as StageKey,
    label: bucket.label,
    lines: playbooks
      .map((p) => ({ p, text: (p.body.path[bucket.value as StageKey] ?? "").trim() }))
      .filter(({ text }) => text !== "")
      .map(({ p, text }) => line(p, text)),
  }));

  const counts = new Map<string, number>();
  for (const p of playbooks)
    for (const v of p.body.what_mattered.picks) counts.set(v, (counts.get(v) ?? 0) + 1);
  const mattered = [...counts.entries()]
    .map(([value, count]) => ({ value, label: matteredLabel(value), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const funnel = (
    [
      ["Firms applied to", "applied"],
      ["Shortlists", "shortlists"],
      ["Interviews", "interviews"],
      ["Offers", "offers"],
    ] as const
  ).map(([label, key]) => ({ label, band: medianBand(playbooks.map((p) => p.body.numbers[key])) }));

  const bg = new Map<string, number>();
  for (const p of playbooks) {
    const label = functionLabel(p.from_function);
    bg.set(label, (bg.get(label) ?? 0) + 1);
  }

  return {
    track,
    playbooks,
    notes,
    stages,
    mattered,
    funnel,
    backgrounds: [...bg.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    latestSafeStart: playbooks.map((p) => line(p, p.body.latest_safe_start)),
    mistakes: playbooks.map((p) => line(p, p.body.mistakes_to_avoid)),
    companies: companiesIn([...playbooks, ...notes]),
  };
}

/** One line per track for the career home: how much there is to read. */
export function trackCounts(
  entries: PublicCareerEntry[],
): { track: string; label: string; playbooks: number; notes: number }[] {
  return TRACKS.map((t) => ({
    track: t.value,
    label: trackShort(t.value),
    playbooks: entries.filter((e) => e.type === "playbook" && e.track === t.value).length,
    notes: entries.filter((e) => e.type === "company_note" && e.track === t.value).length,
  }));
}
