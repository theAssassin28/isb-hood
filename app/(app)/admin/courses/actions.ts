"use server";

import { refresh } from "next/cache";
import { safeCourseId } from "@/lib/auth/access";
import { requireModerator } from "@/lib/auth/session";
import type { ImportState } from "@/components/csv-import-form";
import { parseCourseCsv } from "@/lib/domain/csv";
import { csvFromForm } from "@/lib/domain/csvForm";
import { createClient } from "@/lib/supabase/server";

const uuid = safeCourseId;

export async function importCourses(
  _previous: ImportState,
  formData: FormData,
): Promise<ImportState> {
  await requireModerator();
  const text = await csvFromForm(formData);
  if (text.trim() === "") return { errors: ["Choose a file or paste the rows first."], done: null };

  const parsed = parseCourseCsv(text);
  if (parsed.errors.length > 0) return { errors: parsed.errors, done: null };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_import_courses", { rows: parsed.rows });
  if (error) {
    return { errors: ["The import failed and nothing was changed. Try again."], done: null };
  }

  const counts = data as { courses: number; offerings: number };
  refresh();
  return {
    errors: [],
    done: `Read ${parsed.rows.length} rows: ${counts.courses} new courses, ${counts.offerings} new offerings. Rows that already existed were updated.`,
  };
}

type Outcome = { error: string | null };

export async function approveOffering(offeringId: string): Promise<Outcome> {
  await requireModerator();
  const id = uuid(offeringId);
  if (!id) return { error: "Offering not found." };
  const supabase = await createClient();
  const { error } = await supabase.from("offerings").update({ status: "approved" }).eq("id", id);
  if (error) return { error: "Could not approve that. Try again." };
  refresh();
  return { error: null };
}

export async function deleteOffering(offeringId: string): Promise<Outcome> {
  await requireModerator();
  const id = uuid(offeringId);
  if (!id) return { error: "Offering not found." };
  const supabase = await createClient();
  const { error } = await supabase.from("offerings").delete().eq("id", id);
  if (error) {
    return {
      error:
        error.code === "23503"
          ? "A review is attached to this offering. Approve it, or ask the author to pick another."
          : "Could not delete that. Try again.",
    };
  }
  refresh();
  return { error: null };
}

export async function makeCurrent(offeringId: string): Promise<Outcome> {
  await requireModerator();
  const id = uuid(offeringId);
  if (!id) return { error: "Offering not found." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_current_offering", { target: id });
  if (error) return { error: "Could not change the current offering. Try again." };
  refresh();
  return { error: null };
}

export async function setOpenToReaders(courseId: string, open: boolean): Promise<Outcome> {
  await requireModerator();
  const id = uuid(courseId);
  if (!id) return { error: "Course not found." };
  const supabase = await createClient();
  const { error } = await supabase.from("courses").update({ open_to_readers: open }).eq("id", id);
  if (error) return { error: "Could not save that. Try again." };
  refresh();
  return { error: null };
}
