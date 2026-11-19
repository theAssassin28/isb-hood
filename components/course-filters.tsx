import Link from "next/link";
import { TRACKS, WORKLOAD_BANDS } from "@/lib/constants/vocab";
import { QUANT_QUAL_LABEL } from "@/lib/domain/aggregation";
import type { Filters } from "@/lib/domain/courseList";
import { fieldInput, fieldLabel, primaryButton, primaryButtonInline } from "./styles";

// A plain GET form: works without JavaScript and every result has a shareable URL.
export function CourseFilters({
  filters,
  terms,
  activeCount,
}: {
  filters: Filters;
  terms: string[];
  activeCount: number;
}) {
  const select = (
    name: string,
    label: string,
    value: string,
    options: { value: string; label: string }[],
  ) => (
    <div>
      <label htmlFor={`filter-${name}`} className={fieldLabel}>
        {label}
      </label>
      <select
        id={`filter-${name}`}
        name={name}
        defaultValue={value}
        className={`${fieldInput} mt-1.5`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <form action="/courses" method="get" role="search">
      <label htmlFor="filter-q" className="sr-only">
        Search courses
      </label>
      <div className="flex gap-2">
        <input
          id="filter-q"
          name="q"
          type="search"
          defaultValue={filters.q}
          placeholder="Course, code or professor"
          className={fieldInput}
        />
        <button type="submit" className={primaryButtonInline}>
          Search
        </button>
      </div>

      <details className="mt-3 rounded-md border border-border bg-card" open={activeCount > 0}>
        <summary className="flex min-h-11 cursor-pointer items-center px-4 font-medium text-brand">
          Filters and sort{activeCount > 0 ? ` (${activeCount} on)` : ""}
        </summary>
        <div className="grid grid-cols-2 gap-3 px-4 pb-4">
          {select("term", "Term offered", filters.term ?? "all", [
            { value: "all", label: "All terms" },
            ...terms.map((t) => ({ value: t, label: t })),
          ])}
          {select("workload", "Weekly workload", filters.workload ?? "", [
            { value: "", label: "Any" },
            ...WORKLOAD_BANDS.map((b) => ({ value: b, label: `${b} hours` })),
          ])}
          {select("qq", "Quant or qual", filters.qq ?? "", [
            { value: "", label: "Any" },
            ...(["qual", "balanced", "quant"] as const).map((b) => ({
              value: b,
              label: QUANT_QUAL_LABEL[b],
            })),
          ])}
          {select("track", "Helps for", filters.track ?? "", [
            { value: "", label: "Any track" },
            ...TRACKS.map((t) => ({ value: t.value, label: t.label })),
          ])}
          <div className="col-span-2">
            {select("sort", "Sort by", filters.sort, [
              { value: "reviews", label: "Most reviewed" },
              { value: "learning", label: "Highest learning value" },
            ])}
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <button type="submit" className={`${primaryButton} flex-1`}>
              Show courses
            </button>
            <Link
              href="/courses"
              className="inline-flex min-h-11 items-center px-2 text-sm text-brand underline underline-offset-4"
            >
              Reset
            </Link>
          </div>
        </div>
      </details>
    </form>
  );
}
