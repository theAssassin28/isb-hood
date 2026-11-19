import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mirrorToPosthog } from "./posthog";
import { createClient } from "@/lib/supabase/server";

// The only way to record an event (docs/BUILD_PLAN.md, 8.1). Written on the
// server, in the same code path as the action it describes, to the `events`
// table, which is the source of truth for every pass line.
// Spec events are then copied to PostHog after the response (./posthog.ts).

export type EventName =
  // Spec events (requirements, section 9)
  | "user_signed_up"
  | "course_page_viewed"
  | "career_entry_viewed"
  | "value_reached"
  | "return_visit"
  | "entry_submitted"
  | "comment_posted"
  | "comment_answered"
  | "filter_used"
  | "fake_door_clicked"
  // Diagnostics
  | "form_started"
  | "form_step_completed"
  | "survey_shown"
  | "survey_submitted";

type Props = Record<string, string | number | boolean | null>;

/** Copy to PostHog after the response; never delays or breaks the action. */
function mirror(userId: string, name: string, props: Props): void {
  const at = new Date();
  try {
    after(() => mirrorToPosthog(userId, name, props, at));
  } catch {
    // Outside a request (tests, scripts): send now and forget.
    void mirrorToPosthog(userId, name, props, at);
  }
}

/**
 * Records an event for the signed-in user. Never throws: losing an event must
 * not break the action it describes. Failures are logged for the server logs.
 */
export async function track(userId: string, name: EventName, props: Props = {}): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("events").insert({ user_id: userId, name, props });
    if (error) console.error(`[events] ${name} not recorded: ${error.message}`);
    else mirror(userId, name, props);
  } catch (err) {
    console.error(`[events] ${name} not recorded`, err);
  }
}

/**
 * Records an event the database allows only once: value_reached per module,
 * return_visit per day.
 * A repeat is expected and silently ignored.
 */
export async function trackOnce(
  userId: string,
  name: "value_reached" | "return_visit",
  props: Props & { module: string },
): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("events").insert({ user_id: userId, name, props });
    if (!error) mirror(userId, name, props);
    else if (error.code !== "23505")
      console.error(`[events] ${name} not recorded: ${error.message}`);
  } catch (err) {
    console.error(`[events] ${name} not recorded`, err);
  }
}

/**
 * value_reached for someone other than the person acting: the asker, when the
 * entry's author answers them (plan 6.4). Row level security only lets people
 * record their own events, so this one uses the service role.
 */
export async function trackOnceForOther(
  userId: string,
  props: Props & { module: string },
): Promise<void> {
  try {
    const { error } = await createAdminClient()
      .from("events")
      .insert({ user_id: userId, name: "value_reached", props });
    if (!error) mirror(userId, "value_reached", props);
    else if (error.code !== "23505")
      console.error(`[events] value_reached not recorded: ${error.message}`);
  } catch (err) {
    console.error("[events] value_reached not recorded", err);
  }
}
