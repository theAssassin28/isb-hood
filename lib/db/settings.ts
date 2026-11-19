import "server-only";
import { cache } from "react";
import { DEFAULT_SETTINGS, parseSettings, type AppSettings } from "@/lib/domain/settings";
import { createClient } from "@/lib/supabase/server";

/** Dates and gates, read once per request. Defaults if the read fails. */
export const getSettings = cache(async (): Promise<AppSettings> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value")
    .returns<{ key: string; value: unknown }[]>();
  if (error) {
    console.error(`[settings] using defaults: ${error.message}`);
    return DEFAULT_SETTINGS;
  }
  return parseSettings(data);
});
