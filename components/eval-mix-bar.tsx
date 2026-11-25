import type { EvalKey } from "@/lib/schemas/courseReview";
import type { MixPart } from "@/lib/domain/aggregation";

// Thin segmented bar: one whole (the grade) split into at most six parts.
// Each component keeps one colour everywhere (fixed slot, never cycled). Three
// of the colours are below 3:1 contrast on white, so every part is also named
// with its share in the legend: colour is never the only cue.

const SLOT: Record<EvalKey, string> = {
  eval_participation: "var(--series-1)",
  eval_quizzes: "var(--series-2)",
  eval_individual: "var(--series-3)",
  eval_group: "var(--series-4)",
  eval_midterm: "var(--series-5)",
  eval_final: "var(--series-6)",
};

export function EvalMixBar({ parts }: { parts: MixPart[] }) {
  const description = parts.map((p) => `${p.label} ${p.percent}%`).join(", ");
  return (
    <figure>
      <div
        role="img"
        aria-label={`Evaluation mix: ${description}`}
        className="flex h-2 w-full gap-[2px] overflow-hidden rounded-full"
      >
        {parts.map((part) => (
          <span
            key={part.key}
            title={`${part.label}: ${part.percent}%`}
            className="h-full basis-0"
            style={{ flexGrow: part.percent, backgroundColor: SLOT[part.key] }}
          />
        ))}
      </div>
      <figcaption className="mt-2">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground">
          {parts.map((part) => (
            <li key={part.key} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block size-2.5 rounded-full"
                style={{ backgroundColor: SLOT[part.key] }}
              />
              {/* A real space, so screen readers and copied text read "Final 30%". */}
              {part.label} <span className="font-medium">{part.percent}%</span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
