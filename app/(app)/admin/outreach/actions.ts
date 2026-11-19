"use server";

import { refresh } from "next/cache";
import { requireModerator } from "@/lib/auth/session";
import type { ImportState } from "@/components/csv-import-form";
import { parseOutreachCsv } from "@/lib/domain/csv";
import { csvFromForm } from "@/lib/domain/csvForm";
import { createClient } from "@/lib/supabase/server";

export async function importOutreach(
  _previous: ImportState,
  formData: FormData,
): Promise<ImportState> {
  await requireModerator();
  const text = await csvFromForm(formData);
  if (text.trim() === "") return { errors: ["Choose a file or paste the rows first."], done: null };

  const parsed = parseOutreachCsv(text);
  if (parsed.errors.length > 0) return { errors: parsed.errors, done: null };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_import_outreach", { rows: parsed.rows });
  if (error) {
    return { errors: ["The import failed and nothing was changed. Try again."], done: null };
  }

  const counts = data as { contacts: number; unknown_courses: number };
  refresh();
  return {
    errors: [],
    done:
      `Read ${parsed.rows.length} rows: ${counts.contacts} new people.` +
      (counts.unknown_courses > 0
        ? ` ${counts.unknown_courses} rows named a course code that is not in the course list; the person was added without it.`
        : ""),
  };
}
