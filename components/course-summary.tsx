import type { CourseSummary } from "@/lib/domain/aggregation";
import { EvalMixBar } from "./eval-mix-bar";

// Summary block of the course page (docs/BUILD_PLAN.md 4.4, rules 6.1).

const formatScore = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function CourseSummaryBlock({ summary }: { summary: CourseSummary }) {
  const { count, offeringCount } = summary;
  const agreement =
    summary.learning?.agreement === "high"
      ? "High agreement"
      : summary.learning?.agreement === "mixed"
        ? "Mixed agreement"
        : "Too few reviews to show agreement";

  return (
    <section
      aria-labelledby="summary-heading"
      className="rounded-lg border border-border bg-card p-6"
    >
      <h2 id="summary-heading" className="type-heading">
        What reviewers say
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {count} review{count === 1 ? "" : "s"}
        {offeringCount > 1 ? ` across ${offeringCount} offerings` : ""}
      </p>
      {summary.lowConfidence ? (
        <p className="mt-3 rounded-md border border-warn bg-background p-3 text-sm text-foreground">
          Based on {count} review{count === 1 ? "" : "s"}. One or two people’s experience can differ
          a lot from yours.
        </p>
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
        <Stat
          label="Weekly workload"
          value={summary.workload?.label ?? "—"}
          note="Median, outside class"
        />
        <Stat
          label="Quant or qual"
          value={summary.quantQual?.label ?? "—"}
          note={
            summary.quantQual ? `${summary.quantQual.mean} on a 1 (qual) to 5 (quant) scale` : ""
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

      <Lines title="Who should take it" lines={summary.take} total={summary.takeTotal} />
      <Lines title="Who should skip it" lines={summary.skip} total={summary.skipTotal} />
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

function Lines({
  title,
  lines,
  total,
}: {
  title: string;
  lines: CourseSummary["take"];
  total: number;
}) {
  if (lines.length === 0) return null;
  return (
    <div className="mt-5">
      <h3 className="type-label">{title}</h3>
      <ul className="mt-2 space-y-2">
        {lines.map((line) => (
          <li key={line.reviewId} className="text-sm">
            <p className="break-words text-foreground">“{line.text}”</p>
            <p className="text-sm text-muted-foreground">{line.offering}</p>
          </li>
        ))}
      </ul>
      {total > lines.length ? (
        <a
          href="#reviews"
          className="mt-1 inline-flex min-h-11 items-center text-sm text-brand underline underline-offset-4"
        >
          See all {total} in the reviews below
        </a>
      ) : null}
    </div>
  );
}
