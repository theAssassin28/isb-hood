import type { CourseSummary } from "@/lib/domain/aggregation";
import { CareerPills } from "./career-pills";
import { EvalMixBar } from "./eval-mix-bar";

// Summary block of the course page (docs/BUILD_PLAN.md 4.4, rules 6.1).

const formatScore = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function CourseSummaryBlock({
  summary,
  evidenceScope,
}: {
  summary: CourseSummary;
  evidenceScope: string | null;
}) {
  const { count, offeringCount } = summary;
  const agreement =
    summary.learning?.agreement === "high"
      ? "High agreement"
      : summary.learning?.agreement === "mixed"
        ? "Mixed agreement"
        : "Too few reviews to show agreement";

  const largestShare = Math.max(0, ...(summary.mix ?? []).map((part) => part.percent));
  const largestParts = summary.mix?.filter((part) => part.percent === largestShare);
  const assessment = largestParts?.map((part) => part.label).join(", ");

  return (
    <section
      aria-labelledby="summary-heading"
      className="rounded-lg border border-border bg-card px-4 pt-4 sm:px-6 sm:pt-5"
    >
      <h2 id="summary-heading" className="type-heading">
        What reviewers say
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {summary.lowConfidence ? "Based on " : ""}
        {count} review{count === 1 ? "" : "s"}
        {offeringCount > 1 ? ` across ${offeringCount} offerings` : ""}
        {summary.lowConfidence ? "." : ""}
        {evidenceScope ? ` · ${evidenceScope}` : ""}
      </p>

      <dl className="mt-3 grid gap-3 min-[360px]:grid-cols-2 sm:gap-5">
        <Stat
          label="Weekly workload"
          value={summary.workload?.label ?? "No estimate yet"}
          note={summary.workload ? `${count === 1 ? "Reported" : "Median"}, outside class` : ""}
        />
        <Stat
          label="Top assessment"
          value={assessment ?? "No breakdown yet"}
          note={
            largestShare > 0
              ? `${largestShare}% ${largestParts?.length === 1 ? "of total" : "each"}`
              : ""
          }
        />
      </dl>

      <details className="group mt-1">
        <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-sm text-sm font-medium text-brand [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">Show full summary</span>
          <span className="hidden group-open:inline">Hide full summary</span>
          <span
            aria-hidden="true"
            className="size-1.5 rotate-45 border-r border-b border-current group-open:rotate-[225deg]"
          />
        </summary>
        <div className="border-t border-border pt-4 pb-5">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat
              label="Quant or qual"
              value={summary.quantQual?.label ?? "—"}
              note={
                summary.quantQual
                  ? `${summary.quantQual.mean} on a 1 (qual) to 5 (quant) scale`
                  : ""
              }
            />
            <Stat
              label="Learning value"
              value={summary.learning ? `${formatScore(summary.learning.median)} of 5` : "—"}
              note={summary.learning ? agreement : ""}
            />
            <Stat
              label="Grade risk"
              value={`Low ${summary.gradeRisk.low} · Medium ${summary.gradeRisk.medium} · High ${summary.gradeRisk.high}`}
              small
            />
          </dl>

          {summary.outline ? (
            <p className="mt-4 text-sm text-foreground">
              <span className="font-semibold">{summary.outline.yesPercent}%</span> said the outline
              matched the course
              <span className="text-muted-foreground">
                {" "}
                · {summary.outline.partly} partly · {summary.outline.no} no
              </span>
            </p>
          ) : null}

          {summary.mix ? (
            <div className="mt-5">
              <h3 className="type-label">Evaluation mix</h3>
              <div className="mt-2">
                <EvalMixBar parts={summary.mix} />
              </div>
            </div>
          ) : null}

          {/* Career paths only: the written "who should take or skip it" lines are in
              each review below, so the summary does not repeat them. */}
          {summary.careers.length > 0 ? (
            <div className="mt-5">
              <h3 className="type-label">Who should take it</h3>
              <div className="mt-2">
                <CareerPills tracks={summary.careers} label="Career paths reviewers named" />
              </div>
            </div>
          ) : null}
        </div>
      </details>
    </section>
  );
}

function Stat({
  label,
  value,
  note,
  small,
}: {
  label: string;
  value: string;
  note?: string;
  small?: boolean;
}) {
  return (
    <div>
      <dt className="type-label">{label}</dt>
      <dd className={`font-semibold text-foreground ${small ? "text-sm" : "text-base"}`}>
        {value}
      </dd>
      {note ? <dd className="text-sm text-muted-foreground">{note}</dd> : null}
    </div>
  );
}
