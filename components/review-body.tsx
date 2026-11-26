import { EVALUATION_COMPONENTS, TEACHING_STYLES, WHY_TAKEN } from "@/lib/constants/vocab";
import type { MixPart } from "@/lib/domain/aggregation";
import type { ReviewFields } from "@/lib/schemas/courseReview";
import { CareerPills } from "./career-pills";
import { EvalMixBar } from "./eval-mix-bar";

// One review, as a reader sees it. Used for the preview before publishing and
// on the course page.
//
// Formatted like the "What reviewers say" card (components/course-summary.tsx)
// so the two read as one system: quiet labels over semibold values, the same
// evaluation bar, and spacing (not lines) between parts. The reviewer's own
// words come first, at body size: they are what a reader came for.

const labelOf = (list: readonly { value: string; label: string }[], value: string) =>
  list.find((o) => o.value === value)?.label ?? value;

const labelsOf = (options: readonly { value: string; label: string }[], values: string[]) =>
  values.map((v) => labelOf(options, v)).join(" · ");

const QUANT_QUAL = ["", "Fully qual", "Mostly qual", "Balanced", "Mostly quant", "Fully quant"];
const GRADE_RISK: Record<string, string> = { low: "Low", medium: "Medium", high: "High" };
const OUTLINE_MATCH: Record<string, string> = {
  yes: "Matched the course",
  partly: "Partly matched the course",
  no: "Did not match the course",
};

export function ReviewBody({
  fields,
  offeringLabel,
  authorDisplay,
}: {
  fields: ReviewFields;
  offeringLabel: string;
  authorDisplay: string;
}) {
  const mix: MixPart[] = EVALUATION_COMPONENTS.filter((c) => (fields[c.value] ?? 0) > 0).map(
    (c) => ({ key: c.value, label: c.label, percent: fields[c.value] ?? 0 }),
  );

  return (
    <article className="space-y-5">
      <header>
        <p className="font-semibold text-foreground">{offeringLabel}</p>
        <p className="text-sm text-muted-foreground">{authorDisplay}</p>
      </header>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        <Stat
          label="Weekly workload"
          value={fields.workload_band ? `${fields.workload_band} h` : "—"}
          note="Outside class"
        />
        <Stat
          label="Quant or qual"
          value={fields.quant_qual ? QUANT_QUAL[fields.quant_qual] : "—"}
        />
        <Stat
          label="Learning value"
          value={fields.learning_value ? `${fields.learning_value} of 5` : "—"}
        />
        <Stat label="Grade risk" value={fields.grade_risk ? GRADE_RISK[fields.grade_risk] : "—"} />
      </dl>

      <Text title="What the outline did not tell you" body={fields.outline_gap} />
      <Text title="Who should take it" body={fields.who_should_take} />
      <Text title="Who should skip it" body={fields.who_should_skip} />
      <Text title="Why that learning value" body={fields.learning_value_reason} />
      <Text title="Why that grade risk" body={fields.grade_risk_reason} />

      {mix.length > 0 ? (
        <Part title="Evaluation mix">
          <EvalMixBar parts={mix} />
        </Part>
      ) : null}

      {fields.careers_helped.length > 0 ? (
        <Part title="Careers it helps">
          <CareerPills tracks={fields.careers_helped} label="Careers it helps" />
        </Part>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        {(
          [
            ["Teaching style", labelsOf(TEACHING_STYLES, fields.teaching_styles)],
            ["Why they took it", labelsOf(WHY_TAKEN, fields.why_taken)],
            ["Outline", fields.outline_match ? OUTLINE_MATCH[fields.outline_match] : ""],
          ] as const
        )
          .filter(([, value]) => value !== "")
          .map(([label, value]) => (
            <Stat key={label} label={label} value={value} small />
          ))}
      </dl>
    </article>
  );
}

/** Label over a semibold value, as in the summary card's Stat. */
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

/** A labelled part of a review, spaced like the summary card's sections. */
function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="type-label">{title}</h3>
      <div className="mt-2 text-foreground">{children}</div>
    </section>
  );
}

function Text({ title, body }: { title: string; body: string }) {
  if (body.trim() === "") return null;
  return (
    <section>
      <h3 className="type-label">{title}</h3>
      <p className="mt-1 max-w-[60ch] whitespace-pre-line break-words text-foreground">
        {body.trim()}
      </p>
    </section>
  );
}
