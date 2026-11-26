import "server-only";
import { safeCourseId } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

export type OwnCareerEntry = {
  id: string;
  type: "playbook" | "company_note";
  status: "draft" | "pending_verification" | "live" | "removed";
  visibility: "named" | "anonymous";
  open_to_questions: boolean;
  body: Record<string, unknown>;
  course_ids: string[];
};

/** One of the signed-in person's own entries, for editing. Row level security limits it to theirs. */
export async function getMyCareerEntry(
  userId: string,
  entryIdInput: unknown,
): Promise<OwnCareerEntry | null> {
  const entryId = safeCourseId(entryIdInput);
  if (!entryId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("career_entries")
    .select("id, type, status, visibility, open_to_questions, body")
    .eq("id", entryId)
    .eq("author_id", userId)
    .maybeSingle<Omit<OwnCareerEntry, "course_ids">>();
  if (!data) return null;
  const { data: links } = await supabase
    .from("career_entry_courses")
    .select("course_id")
    .eq("entry_id", entryId)
    .returns<{ course_id: string }[]>();
  return { ...data, course_ids: (links ?? []).map((l) => l.course_id) };
}
