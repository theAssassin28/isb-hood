"use server";

import { safeCourseId } from "@/lib/auth/access";
import { requireReader } from "@/lib/auth/session";
import { getCareerEntry } from "@/lib/db/careers";
import { getSettings } from "@/lib/db/settings";
import { matchesBackground, matchesTrack, type CareerFilterName } from "@/lib/domain/careers";
import { track, trackOnce } from "@/lib/domain/events";
import { careersOpenTo, returnVisit } from "@/lib/domain/settings";

// Sent by the entry page once it is on screen (a prefetch is not a view).
// What is recorded is worked out here from the database, never from the browser.

export async function recordCareerView(entryIdInput: string): Promise<void> {
  const { profile } = await requireReader();
  const entryId = safeCourseId(entryIdInput);
  if (!entryId) return;
  const settings = await getSettings();
  if (!careersOpenTo(profile, settings)) return;
  const entry = await getCareerEntry(entryId);
  if (!entry || entry.is_mine) return;

  const background = matchesBackground(entry, profile);
  const sameTrack = matchesTrack(entry, profile);
  await track(profile.id, "career_entry_viewed", {
    entry_id: entryId,
    entry_type: entry.type,
    track: entry.track,
    matches_reader_background: background,
  });

  const visit = returnVisit(new Date(), profile.profile_completed_at);
  if (visit) await trackOnce(profile.id, "return_visit", { ...visit, module: "career" });

  // "Got the thing" for careers: an entry from someone like me or on my track (plan 6.4).
  if (background || sameTrack) {
    await trackOnce(profile.id, "value_reached", {
      module: "career",
      trigger: background ? "career_entry_background_match" : "career_entry_track_match",
      entry_id: entryId,
    });
  }
}

const FILTER_NAMES: CareerFilterName[] = ["type", "track", "company", "background", "like_me"];

/** Diagnostic only (plan 6.4): never counted as an outcome. */
export async function recordCareerFilters(names: string[]): Promise<void> {
  const { profile } = await requireReader();
  const valid = [...new Set(names)].filter((n): n is CareerFilterName =>
    FILTER_NAMES.includes(n as CareerFilterName),
  );
  for (const name of valid) {
    await track(profile.id, "filter_used", { filter_name: name, page: "careers" });
  }
}
