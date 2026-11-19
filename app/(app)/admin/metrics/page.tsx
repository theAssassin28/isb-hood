import type { Metadata } from "next";
import { Suspense } from "react";
import { notice, pageColumn } from "@/components/styles";
import { requireModerator } from "@/lib/auth/session";
import { MetricsSection } from "@/components/metrics-section";
import { buildReport, type Snapshot } from "@/lib/domain/metrics";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Metrics · ISB Hood admin" };

// Every pass line (docs/BUILD_PLAN.md 8.2). Numbers come from
// metrics_snapshot() in supabase/migrations/0008; pass lines and decision
// rules from lib/domain/metrics.ts.

export default function MetricsPage() {
  return (
    <main className={pageColumn}>
      <h1 className="type-title">Metrics</h1>
      <p className="mt-2 text-foreground/80">
        Every pass line and decision rule, live. Survey results under the minimum sample are
        inconclusive: extend the survey, do not decide.
      </p>
      <p className="mt-2 flex flex-wrap gap-x-4 text-sm">
        <a
          href="/admin/metrics/export"
          className="inline-flex min-h-11 items-center text-brand underline underline-offset-4"
        >
          Download as CSV
        </a>
        <a
          href="/admin/metrics/export?kind=surveys"
          className="inline-flex min-h-11 items-center text-brand underline underline-offset-4"
        >
          Survey answers as CSV
        </a>
      </p>
      <div className="mt-4">
        <Suspense fallback={<p className="text-muted-foreground">Counting…</p>}>
          <Report />
        </Suspense>
      </div>
    </main>
  );
}

async function Report() {
  await requireModerator();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("metrics_snapshot");
  if (error || !data) {
    return (
      <p role="alert" className={notice}>
        Metrics could not be computed. Reload to try again.
      </p>
    );
  }
  const snapshot = data as Snapshot;
  const sections = buildReport(snapshot);
  const asOf = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(snapshot.computed_at));

  return (
    <>
      <p className="text-sm text-muted-foreground">As of {asOf} IST.</p>
      <div className="mt-4 space-y-8">
        {sections.map((section) => (
          <MetricsSection key={section.title} section={section} />
        ))}
      </div>
    </>
  );
}
