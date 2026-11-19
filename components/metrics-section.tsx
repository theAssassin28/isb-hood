import type { Section, Status } from "@/lib/domain/metrics";

// One block of /admin/metrics: rows with value, target and a status shown as
// a word and a mark, never colour alone.

const STATUS: Record<Status, { label: string; mark: string; className: string }> = {
  pass: { label: "Pass", mark: "✓", className: "text-good" },
  not_yet: { label: "Not yet", mark: "…", className: "text-muted-foreground" },
  fail: { label: "Below the line", mark: "✕", className: "text-destructive" },
  inconclusive: { label: "Inconclusive", mark: "?", className: "text-warn" },
  info: { label: "", mark: "", className: "" },
};

const TONE = {
  good: "border-good/40 bg-good/5",
  warn: "border-warn/40 bg-warn/5",
  bad: "border-destructive/40 bg-destructive/5",
  neutral: "border-border bg-muted",
} as const;

export function MetricsSection({ section }: { section: Section }) {
  return (
    <section aria-labelledby={`s-${section.title}`}>
      <h2 id={`s-${section.title}`} className="type-heading">
        {section.title}
      </h2>
      <table className="mt-2 w-full text-sm">
        <thead className="sr-only">
          <tr>
            <th>Metric</th>
            <th>Value</th>
            <th>Target</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {section.rows.map((row) => {
            const status = STATUS[row.status];
            return (
              <tr key={row.label} className="align-top">
                <th scope="row" className="py-2 pr-2 text-left font-normal text-foreground">
                  {row.label}
                  {row.note ? (
                    <span className="block text-sm text-muted-foreground">{row.note}</span>
                  ) : null}
                </th>
                <td className="py-2 pr-2 text-right font-semibold whitespace-nowrap text-foreground tabular-nums">
                  {row.value}
                  {row.target !== "—" ? (
                    <span className="block text-sm font-normal text-muted-foreground">
                      target {row.target}
                    </span>
                  ) : null}
                </td>
                <td className={`w-24 py-2 text-right text-sm font-medium ${status.className}`}>
                  {status.label ? (
                    <>
                      <span aria-hidden="true">{status.mark} </span>
                      {status.label}
                    </>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {section.decision ? (
        <p
          className={`mt-3 rounded-md border p-3 text-sm text-foreground ${TONE[section.decision.tone]}`}
        >
          <span className="font-semibold">Decision: </span>
          {section.decision.text}
        </p>
      ) : null}
    </section>
  );
}
