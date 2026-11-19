import "server-only";
import type { PublicComment } from "@/lib/domain/threads";
import { createClient } from "@/lib/supabase/server";

const COLUMNS =
  "id, entry_type, entry_id, parent_id, body, created_at, first_reply_at, is_entry_author, author_display, is_mine";

/** Live comments under these entries, through comments_public. null if the read failed. */
export async function listComments(
  entryType: "course_review" | "career_entry",
  entryIds: string[],
): Promise<PublicComment[] | null> {
  if (entryIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments_public")
    .select(COLUMNS)
    .eq("entry_type", entryType)
    .in("entry_id", entryIds)
    .order("created_at")
    .returns<PublicComment[]>();
  return error ? null : data;
}
