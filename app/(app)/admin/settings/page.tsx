import type { Metadata } from "next";
import { Suspense } from "react";
import { pageColumn } from "@/components/styles";
import { requireModerator } from "@/lib/auth/session";
import { getSettings } from "@/lib/db/settings";
import { SettingsForm } from "./form";

export const metadata: Metadata = { title: "Settings · ISB Hood admin" };

// Dates and gates (docs/BUILD_PLAN.md 7). Dates are Indian calendar days.
export default function SettingsPage() {
  return (
    <main className={pageColumn}>
      <h1 className="type-title">Settings</h1>
      <p className="mt-2 text-foreground/80">
        Dates are calendar days in India. Every change is recorded with your name.
      </p>
      <div className="mt-6">
        <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
          <Current />
        </Suspense>
      </div>
    </main>
  );
}

async function Current() {
  await requireModerator();
  return <SettingsForm current={await getSettings()} />;
}
