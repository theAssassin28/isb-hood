// Pure parts of the PostHog mirror, kept apart so they can be unit-tested.

/** Spec events (plan 8.1). Diagnostics stay in our own table. */
export const MIRRORED_EVENTS = new Set([
  "user_signed_up",
  "course_page_viewed",
  "career_entry_viewed",
  "value_reached",
  "return_visit",
  "entry_submitted",
  "comment_posted",
  "comment_answered",
  "filter_used",
  "fake_door_clicked",
]);

export function posthogPayload(args: {
  apiKey: string;
  userId: string;
  name: string;
  props: Record<string, unknown>;
  at: Date;
}) {
  return {
    api_key: args.apiKey,
    event: args.name,
    distinct_id: args.userId,
    properties: { ...args.props, source: "isb-hood-server" },
    timestamp: args.at.toISOString(),
  };
}
