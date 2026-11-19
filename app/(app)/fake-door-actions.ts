"use server";

import { safeCourseId } from "@/lib/auth/access";
import { requireReader } from "@/lib/auth/session";
import { track } from "@/lib/domain/events";
import { createClient } from "@/lib/supabase/server";

// Fake doors (docs/BUILD_PLAN.md 4.8): buttons for features not built yet.
// A click is the evidence; "Yes, early access" is stronger evidence. We
// already have the person's email, so we never ask for contact details.

export type Door = "request_chat" | "find_people";
const DOORS: Door[] = ["request_chat", "find_people"];

export async function recordFakeDoor(door: Door, entryId: string | null): Promise<void> {
  const { profile } = await requireReader();
  if (!DOORS.includes(door)) return;
  await track(profile.id, "fake_door_clicked", {
    door,
    entry_id: entryId ? safeCourseId(entryId) : null,
    left_contact: false,
  });
}

export async function leaveContact(
  door: Door,
  entryId: string | null,
): Promise<{ error: string | null }> {
  const { profile } = await requireReader();
  if (!DOORS.includes(door)) return { error: "Unknown feature." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update(door === "request_chat" ? { early_access_chat: true } : { early_access_people: true })
    .eq("id", profile.id);
  if (error) return { error: "That did not save. Try again." };
  await track(profile.id, "fake_door_clicked", {
    door,
    entry_id: entryId ? safeCourseId(entryId) : null,
    left_contact: true,
  });
  return { error: null };
}
