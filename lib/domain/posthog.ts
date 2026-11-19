import "server-only";

// Copies spec events to PostHog's free plan for funnels and session views
// (docs/BUILD_PLAN.md 2, 8.1). The `events` table stays the source of truth;
// if PostHog is down or not configured, nothing else is affected.
// Only the pseudonymous user id is sent: never a name, email or anything typed.
// Capture API: POST {host}/i/v0/e/ (https://posthog.com/docs/api/capture).
// The host is the ingestion host (https://us.i.posthog.com or
// https://eu.i.posthog.com), not the app host.

import { MIRRORED_EVENTS, posthogPayload } from "./posthogPayload";

export async function mirrorToPosthog(
  userId: string,
  name: string,
  props: Record<string, unknown>,
  at: Date,
): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.replace(/\/$/, "");
  if (!apiKey || !host || !MIRRORED_EVENTS.has(name)) return;
  try {
    const res = await fetch(`${host}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(posthogPayload({ apiKey, userId, name, props, at })),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error(`[posthog] ${name} not mirrored: HTTP ${res.status}`);
  } catch (err) {
    console.error(`[posthog] ${name} not mirrored`, err);
  }
}
