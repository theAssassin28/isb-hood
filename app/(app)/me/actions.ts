"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type PrefState = { saved: boolean; error: string | null };

export async function updateNotifyPref(
  _previous: PrefState,
  formData: FormData,
): Promise<PrefState> {
  const { profile } = await requireUser();
  const pref = formData.get("notify_pref");
  if (pref !== "instant" && pref !== "daily" && pref !== "off") {
    return { saved: false, error: "Choose one of the options." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ notify_pref: pref })
    .eq("id", profile.id);
  if (error) return { saved: false, error: "That did not save. Try again." };
  refresh();
  return { saved: true, error: null };
}

export type DeleteState = { error: string | null };

export async function deleteAccount(
  _previous: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  await requireUser();
  if (
    String(formData.get("confirm") ?? "")
      .trim()
      .toLowerCase() !== "delete"
  ) {
    return { error: "Type delete to confirm." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: "Your account was not deleted. Try again, or ask the ISB Hood team." };
  await supabase.auth.signOut();
  redirect("/account-deleted");
}
