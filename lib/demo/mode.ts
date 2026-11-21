import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Demo mode: the clickable prototype on dummy data (lib/demo/seed-data.ts),
 * with no Supabase, email or PostHog. On whenever Supabase keys are not set;
 * ISB_HOOD_DEMO=1 forces it on, ISB_HOOD_DEMO=0 forces it off.
 */
export function isDemo(): boolean {
  if (process.env.ISB_HOOD_DEMO === "1") return true;
  if (process.env.ISB_HOOD_DEMO === "0") return false;
  return !isSupabaseConfigured();
}
