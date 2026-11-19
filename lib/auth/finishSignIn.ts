import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { decideAccess, DEFAULT_READER_DOMAINS, landingPath, type AccountType } from "./access";
import { clearIntent, readIntent } from "./intent";

// What happens once someone has proved they own an email address (they typed
// the code we sent). The access rules in docs/BUILD_PLAN.md section 3 are
// applied here, on the server, from the email on the verified session.

type ProfileRow = {
  deleted_at: string | null;
  account_type: AccountType;
  source: string | null;
  profile_completed_at: string | null;
};

/** ISB email domains readers may use. Read with the service role: anonymous visitors cannot read settings. */
export async function readerDomains(): Promise<string[]> {
  const { data } = await createAdminClient()
    .from("app_settings")
    .select("value")
    .eq("key", "allowed_reader_domains")
    .maybeSingle<{ value: unknown }>();
  return Array.isArray(data?.value) && data.value.every((d) => typeof d === "string")
    ? (data.value as string[])
    : DEFAULT_READER_DOMAINS;
}

/** Returns where to send the person next. */
export async function finishSignIn(supabase: SupabaseClient, user: User): Promise<string> {
  if (!user.email) return "/signin-problem";
  const admin = createAdminClient();
  const intent = await readIntent();

  // The database trigger normally creates the profile; make sure it exists.
  await admin
    .from("profiles")
    .upsert(
      { id: user.id, email: user.email, full_name: null },
      { onConflict: "id", ignoreDuplicates: true },
    );

  const [{ data: profile }, allowedDomains] = await Promise.all([
    admin
      .from("profiles")
      .select("account_type, source, profile_completed_at, deleted_at")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>(),
    readerDomains(),
  ]);
  if (!profile) return "/signin-problem";
  if (profile.deleted_at) {
    await supabase.auth.signOut();
    await clearIntent();
    return "/account-deleted";
  }

  const decision = decideAccess({
    email: user.email,
    intent: intent.intent,
    allowedDomains,
    // `source` is first set when someone comes through a contributor link.
    isReturningContributor: profile.account_type === "contributor" && profile.source !== null,
  });

  if (decision.kind === "reject") {
    // No account for a non-ISB address that did not come from a contributor link.
    await supabase.auth.signOut();
    await admin.auth.admin.deleteUser(user.id);
    await clearIntent();
    return "/not-isb";
  }

  const updates: Record<string, string> = {};
  if (decision.kind === "isb" && profile.account_type !== "isb") {
    updates.account_type = "isb";
    updates.verification_status = "not_required";
  }
  if (decision.kind === "contributor" && profile.source === null) {
    updates.source = intent.src ? `campaign:${intent.src}` : "contributor-link";
  }
  if (Object.keys(updates).length > 0) {
    const { error } = await admin.from("profiles").update(updates).eq("id", user.id);
    if (error) return "/signin-problem";
  }

  if (!profile.profile_completed_at) return "/onboarding";
  await clearIntent();
  return landingPath(intent);
}
