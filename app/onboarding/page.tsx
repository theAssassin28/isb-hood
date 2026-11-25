import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { StackSkeleton } from "@/components/skeleton";
import { pageColumn } from "@/components/styles";
import { ThemeToggle } from "@/components/theme-switch";
import { requireUser } from "@/lib/auth/session";
import type { ProfileField } from "@/lib/schemas/profile";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "About you · ISB Hood" };

export default function OnboardingPage() {
  return (
    <main className={pageColumn}>
      <div className="flex items-center justify-between">
        <p className="type-label">ISB Hood</p>
        <ThemeToggle />
      </div>
      <h1 className="mt-1 type-title">About you</h1>
      <p className="mt-2 text-foreground/80">
        One screen, asked once. It lets readers find entries from people with their background.
      </p>
      <div className="mt-6">
        <Suspense fallback={<StackSkeleton label="Loading your details…" />}>
          <Onboarding />
        </Suspense>
      </div>
    </main>
  );
}

async function Onboarding() {
  const { profile, shell } = await requireUser();
  if (shell !== "onboarding") redirect("/");

  const defaults: Partial<Record<ProfileField, string>> = {};
  if (profile.full_name) defaults.full_name = profile.full_name;

  return (
    <OnboardingForm
      defaults={defaults}
      askHeardFrom={profile.source === null}
      isContributor={profile.account_type === "contributor"}
    />
  );
}
