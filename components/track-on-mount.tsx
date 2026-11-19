"use client";

import { useEffect, useRef } from "react";

/**
 * Calls a bound server action once, after the page is on screen. Renders
 * nothing. Give it a `key` that changes when a new event should be sent.
 */
export function TrackOnMount({ action }: { action: () => Promise<void> }) {
  const sent = useRef(false);
  useEffect(() => {
    // React runs effects twice in development; send once.
    if (sent.current) return;
    sent.current = true;
    action().catch(() => {
      // Losing a view event must never disturb the reader.
    });
  }, [action]);
  return null;
}
