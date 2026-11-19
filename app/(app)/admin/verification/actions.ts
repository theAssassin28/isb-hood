"use server";

import { refresh } from "next/cache";
import { safeCourseId } from "@/lib/auth/access";
import { requireModerator } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type VerifyState = { error: string | null };

const isUuid = safeCourseId; // same shape check

/**
 * Verify or reject a contributor. The database function re-checks that the
 * caller is a moderator, then publishes everything the person has waiting.
 */
export async function decideContributor(
  _previous: VerifyState,
  formData: FormData,
): Promise<VerifyState> {
  await requireModerator();

  const target = isUuid(formData.get("target"));
  const decision = formData.get("decision");
  const contact = isUuid(formData.get("contact"));
  if (!target || (decision !== "verify" && decision !== "reject")) {
    return { error: "That request was incomplete. Reload the page and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("verify_contributor", {
    target,
    approve: decision === "verify",
    contact: decision === "verify" ? contact : null,
  });
  if (error) {
    return { error: "Could not save that decision. Try again." };
  }

  refresh();
  return { error: null };
}
