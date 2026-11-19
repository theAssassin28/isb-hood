"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { safeCourseId } from "@/lib/auth/access";
import { requireModerator } from "@/lib/auth/session";
import { sendEditRequest } from "@/lib/email/notify";
import { createClient } from "@/lib/supabase/server";

type Resolution = "kept" | "removed" | "edit_requested";

/** Resolve every open flag on one item. The database re-checks the moderator role. */
export async function resolveFlags(
  targetType: string,
  targetIdInput: string,
  resolution: Resolution,
): Promise<{ error: string | null }> {
  await requireModerator();
  const targetId = safeCourseId(targetIdInput);
  if (
    !targetId ||
    !["course_review", "career_entry", "comment"].includes(targetType) ||
    !["kept", "removed", "edit_requested"].includes(resolution)
  ) {
    return { error: "That request was incomplete. Reload and try again." };
  }
  if (resolution === "edit_requested" && targetType !== "course_review") {
    return { error: "Edit requests are for reviews only." };
  }

  const supabase = await createClient();
  const { data: open } = await supabase
    .from("flags")
    .select("reason")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .is("resolved_at", null)
    .returns<{ reason: string }[]>();

  const { error } = await supabase.rpc("resolve_flags", {
    p_target_type: targetType,
    p_target_id: targetId,
    p_resolution: resolution,
  });
  if (error) return { error: "That did not save. Try again." };

  if (resolution === "edit_requested") {
    const reasons = [...new Set((open ?? []).map((f) => f.reason))];
    after(() => sendEditRequest(targetId, reasons));
  }
  refresh();
  return { error: null };
}
