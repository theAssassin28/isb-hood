import { EVALUATION_COMPONENTS, TEACHING_STYLES, TRACKS, WHY_TAKEN } from "@/lib/constants/vocab";
import type { ReviewFields } from "@/lib/schemas/courseReview";

// One review, as a reader sees it. Used for the preview before publishing and,
// from M3, on the course page.

const labelOf = (list: readonly { value: string; label: string }[], value: string) =>
  list.find((o) => o.value === value)?.label ?? value;

const QUANT_QUAL = ["", "Fully qual", "Mostly qual", "Balanced", "Mostly quant", "Fully quant"];
const GRADE_RISK: Record<string, string> = { low: "Low", medium: "Medium", high: "High" };
const OUTLINE_MATCH: Record<string, string> = {
  yes: "Yes, the outline matched",
  partly: "Partly matched the outline",
  no: "No, it did not match the outline",
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
  const mix = EVALUATION_COMPONENTS.filter((c) => (fields[c.value] ?? 0) > 0);

  return (
    <article className="space-y-4">
      <header>
        <p className="font-semibold text-foreground">{offeringLabel}</p>
        <p className="text-sm text-muted-foreground">{authorDisplay}</p>
      </header>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Fact
          label="Weekly workload"
          value={fields.workload_band ? `${fields.workload_band} hours` : "—"}
        />
        <Fact
          label="Quant or qual"
          value={fields.quant_qual ? QUANT_QUAL[fields.quant_qual] : "—"}
        />
        <Fact
          label="Learning value"
          value={fields.learning_value ? `${fields.learning_value} of 5` : "—"}
        />
        <Fact label="Grade risk" value={fields.grade_risk ? GRADE_RISK[fields.grade_risk] : "—"} />
      </dl>

      {mix.length > 0 ? (
        <Section title="Evaluation mix">
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {mix.map((c) => (
              <li key={c.value}>
                {c.label} <span className="font-medium">{fields[c.value]}%</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Text title="What the outline did not tell you" body={fields.outline_gap} />
      <Text title="Why that learning value" body={fields.learning_value_reason} />
      <Text title="Why that grade risk" body={fields.grade_risk_reason} />
      <Text title="Who should take it" body={fields.who_should_take} />
      <Text title="Who should skip it" body={fields.who_should_skip} />

      <Tags title="Teaching style" values={fields.teaching_styles} options={TEACHING_STYLES} />
      <Tags title="Careers it helps" values={fields.careers_helped} options={TRACKS} />
      <Tags title="Why they took it" values={fields.why_taken} options={WHY_TAKEN} />

      {fields.outline_match ? (
        <p className="text-sm text-muted-foreground">{OUTLINE_MATCH[fields.outline_match]}</p>
      ) : null}
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="type-label">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="type-label">{title}</h3>
      <div className="mt-1 text-foreground">{children}</div>
    </section>
  );
}

function Text({ title, body }: { title: string; body: string }) {
  if (body.trim() === "") return null;
  return (
    <Section title={title}>
      <p className="whitespace-pre-line break-words">{body.trim()}</p>
    </Section>
  );
}

function Tags({
  title,
  values,
  options,
}: {
  title: string;
  values: string[];
  options: readonly { value: string; label: string }[];
}) {
  if (values.length === 0) return null;
  return <Section title={title}>{values.map((v) => labelOf(options, v)).join(" · ")}</Section>;
}
