import { NextResponse, type NextRequest } from "next/server";
import { safeCourseId } from "@/lib/auth/access";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

// The link in every comment email: /reply/<commentId>. One stable address that
// signs the person in if needed, then lands on that thread's reply box.
export async function GET(request: NextRequest, ctx: RouteContext<"/reply/[commentId]">) {
  const { commentId: raw } = await ctx.params;
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));

  const commentId = safeCourseId(raw);
  if (!commentId) return to("/me?gone=1");

  const user = await getCurrentUser();
  if (!user) return to(`/signin?next=${encodeURIComponent(`/reply/${commentId}`)}`);
  if (user.shell === "onboarding") return to("/onboarding");
  if (user.shell !== "full") return to("/");

  const supabase = await createClient();
  const { data: comment } = await supabase
    .from("comments_public")
    .select("id, entry_type, entry_id, parent_id")
    .eq("id", commentId)
    .maybeSingle<{ id: string; entry_type: string; entry_id: string; parent_id: string | null }>();
  if (!comment) return to("/me?gone=1");
  const thread = comment.parent_id ?? comment.id;

  if (comment.entry_type === "career_entry") {
    const { data: entry } = await supabase
      .from("career_entries_public")
      .select("id")
      .eq("id", comment.entry_id)
      .maybeSingle<{ id: string }>();
    if (!entry) return to("/me?gone=1");
    return to(`/careers/${entry.id}?thread=${thread}#thread-${thread}`);
  }

  const { data: review } = await supabase
    .from("course_reviews_public")
    .select("course_id")
    .eq("id", comment.entry_id)
    .maybeSingle<{ course_id: string }>();
  if (!review) return to("/me?gone=1");
  return to(`/courses/${review.course_id}?thread=${thread}#thread-${thread}`);
}
