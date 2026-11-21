import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createDemoClient } from "@/lib/demo/client";
import { isDemo } from "@/lib/demo/mode";
import { supabaseUrl } from "./env";

function realAdminClient(key: string) {
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Service-role client: bypasses row level security. Use only where the user's
 * own session cannot do the job (setting account type after the domain check,
 * removing a rejected sign-in, scheduled jobs). Never import from client code.
 * In demo mode it is the in-memory stand-in with no row level security.
 */
export function createAdminClient(): ReturnType<typeof realAdminClient> {
  if (isDemo())
    return createDemoClient({ uid: null, admin: true }) as unknown as ReturnType<
      typeof realAdminClient
    >;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set (see docs/RUNBOOK.md)");
  }
  return realAdminClient(key);
}
