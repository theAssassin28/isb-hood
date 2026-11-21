import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createDemoClient, DEMO_COOKIE } from "@/lib/demo/client";
import { isDemo } from "@/lib/demo/mode";
import { supabaseAnonKey, supabaseUrl } from "./env";

function realClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called while rendering a Server Component, where cookies are
          // read-only. proxy.ts refreshes the session, so this is safe to skip.
        }
      },
    },
  });
}

/**
 * Supabase client that acts as the signed-in user: row level security applies.
 * This is the client for almost everything. In demo mode it is the in-memory
 * stand-in (lib/demo), acting as the person picked on the demo sign-in screen.
 */
export async function createClient(): Promise<ReturnType<typeof realClient>> {
  const cookieStore = await cookies();
  if (isDemo()) {
    // The in-memory demo makes no network calls, so tell Next this render is
    // per request before it reads the clock.
    await connection();
    return createDemoClient({
      uid: cookieStore.get(DEMO_COOKIE)?.value ?? null,
      admin: false,
      cookies: cookieStore,
    }) as unknown as ReturnType<typeof realClient>;
  }
  return realClient(cookieStore);
}
