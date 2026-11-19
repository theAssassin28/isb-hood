import { NextResponse, type NextRequest } from "next/server";
import {
  decideAccess,
  landingPath,
  DEFAULT_READER_DOMAINS,
  type AccountType,
} from "@/lib/auth/access";
import { clearIntent, readIntent } from "@/lib/auth/intent";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  deleted_at: string | null;
  account_type: AccountType;
  source: string | null;
  profile_completed_at: string | null;
};

// Google sends the browser back here. This is where the access rules in
// docs/BUILD_PLAN.md section 3 are applied, on the server, from the email on
// the verified session.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const to = (path: string) => NextResponse.redirect(new URL(path, origin));

  const code = searchParams.get("code");
  if (!code || !isSupabaseConfigured()) return to("/signin-problem");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  const user = data?.user;
  if (error || !user?.email) return to("/signin-problem");

  const admin = createAdminClient();
  const intent = await readIntent();

  // The database trigger normally creates the profile; make sure it exists.
  await admin.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );

  const [{ data: profile }, { data: setting }] = await Promise.all([
    admin
      .from("profiles")
      .select("account_type, source, profile_completed_at, deleted_at")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>(),
    admin
      .from("app_settings")
      .select("value")
      .eq("key", "allowed_reader_domains")
      .maybeSingle<{ value: unknown }>(),
  ]);
  if (!profile) return to("/signin-problem");
  if (profile.deleted_at) {
    await supabase.auth.signOut();
    await clearIntent();
    return to("/account-deleted");
  }

  const allowedDomains =
    Array.isArray(setting?.value) && setting.value.every((d) => typeof d === "string")
      ? (setting.value as string[])
      : DEFAULT_READER_DOMAINS;

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
    return to("/not-isb");
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
    const { error: updateError } = await admin.from("profiles").update(updates).eq("id", user.id);
    if (updateError) return to("/signin-problem");
  }

  if (!profile.profile_completed_at) return to("/onboarding");

  await clearIntent();
  return to(landingPath(intent));
}
