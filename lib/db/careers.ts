import "server-only";
import {
  PUBLIC_CAREER_COLUMNS,
  toPublicCareerEntry,
  type PublicCareerEntry,
} from "@/lib/domain/careers";
import { createClient } from "@/lib/supabase/server";

// Other people's career entries, only ever through career_entries_public:
// live entries, with the author shown the way they chose.

const parse = (rows: Record<string, unknown>[]) =>
  rows.map(toPublicCareerEntry).filter((e): e is PublicCareerEntry => e !== null);

/** Every live career entry, newest first. Tens of rows. null if the read failed. */
export async function listCareerEntries(): Promise<PublicCareerEntry[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("career_entries_public")
    .select(PUBLIC_CAREER_COLUMNS)
    .order("published_at", { ascending: false })
    .returns<Record<string, unknown>[]>();
  return error ? null : parse(data);
}

/** One live entry, or null if it does not exist, is not live, or could not be read. */
export async function getCareerEntry(id: string): Promise<PublicCareerEntry | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("career_entries_public")
    .select(PUBLIC_CAREER_COLUMNS)
    .eq("id", id)
    .maybeSingle<Record<string, unknown>>();
  if (error || !data) return null;
  return toPublicCareerEntry(data);
}

export type HelpedCourse = { id: string; code: string; title: string };

/** "Courses that helped" for these entries, keyed by entry id. */
export async function listEntryCourses(entryIds: string[]): Promise<Map<string, HelpedCourse[]>> {
  const out = new Map<string, HelpedCourse[]>();
  if (entryIds.length === 0) return out;
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("career_entry_courses")
    .select("entry_id, course_id")
    .in("entry_id", entryIds)
    .returns<{ entry_id: string; course_id: string }[]>();
  if (!links || links.length === 0) return out;
  const { data: courses } = await supabase
    .from("courses")
    .select("id, code, title")
    .in("id", [...new Set(links.map((l) => l.course_id))])
    .returns<HelpedCourse[]>();
  const byId = new Map((courses ?? []).map((c) => [c.id, c]));
  for (const link of links) {
    const course = byId.get(link.course_id);
    if (!course) continue;
    out.set(link.entry_id, [...(out.get(link.entry_id) ?? []), course]);
  }
  return out;
}

export type MyCareerEntry = {
  id: string;
  type: "playbook" | "company_note";
  status: "draft" | "pending_verification" | "live" | "removed";
  track: string | null;
  company: string | null;
  from_function: string | null;
  body: Record<string, unknown>;
  updated_at: string;
};

/** The signed-in person's own entries, any status. Row level security allows only their own. */
export async function listMyCareerEntries(userId: string): Promise<MyCareerEntry[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("career_entries")
    .select("id, type, status, track, company, from_function, body, updated_at")
    .eq("author_id", userId)
    .order("updated_at", { ascending: false })
    .returns<MyCareerEntry[]>();
  return error ? null : data;
}
