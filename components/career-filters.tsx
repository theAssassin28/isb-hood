import Link from "next/link";
import { FUNCTIONS, TRACKS } from "@/lib/constants/vocab";
import type { CareerFilters as Filters } from "@/lib/domain/careers";
import { fieldInput, fieldLabel, primaryButton } from "./styles";

// A plain GET form, like the course filters: works without JavaScript and every
// result has a shareable URL.
export function CareerFilters({
  filters,
  companies,
  activeCount,
  canLikeMe,
}: {
  filters: Filters;
  companies: string[];
  activeCount: number;
  /** False when the reader has not given a background, so "Like me" has nothing to match. */
  canLikeMe: boolean;
}) {
  const select = (
    name: string,
    label: string,
    value: string,
    options: { value: string; label: string }[],
  ) => (
    <div>
      <label htmlFor={`career-${name}`} className={fieldLabel}>
        {label}
      </label>
      <select
        id={`career-${name}`}
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
    <form action="/careers" method="get" role="search" aria-label="Filter career entries">
      {canLikeMe ? (
        <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-input p-3">
          <input
            type="checkbox"
            name="like"
            value="1"
            defaultChecked={filters.likeMe}
            className="mt-0.5 size-5 shrink-0 accent-foreground"
          />
          <span>
            <span className="block text-base font-medium text-foreground">Like me</span>
            <span className="block text-sm text-muted-foreground">
              Only people who had your job function or industry before ISB.
            </span>
          </span>
        </label>
      ) : null}

      <details className="mt-3 rounded-md border border-border bg-card" open={activeCount > 0}>
        <summary className="flex min-h-11 cursor-pointer items-center px-4 font-medium text-brand">
          Filters{activeCount > 0 ? ` (${activeCount} on)` : ""}
        </summary>
        <div className="grid grid-cols-2 gap-3 px-4 pb-4">
          {select("type", "Kind", filters.type ?? "", [
            { value: "", label: "Both" },
            { value: "playbook", label: "Playbooks" },
            { value: "company_note", label: "Company notes" },
          ])}
          {select("track", "Track", filters.track ?? "", [
            { value: "", label: "Any track" },
            ...TRACKS.map((t) => ({ value: t.value, label: t.label })),
          ])}
          {select("background", "Background before ISB", filters.background ?? "", [
            { value: "", label: "Any" },
            ...FUNCTIONS.map((f) => ({ value: f.value, label: f.label })),
          ])}
          {select("company", "Company", filters.company ?? "", [
            { value: "", label: "Any" },
            ...companies.map((c) => ({ value: c, label: c })),
          ])}
        </div>
      </details>

      <div className="mt-3 flex items-center gap-3">
        <button type="submit" className={`${primaryButton} flex-1`}>
          Show entries
        </button>
        {activeCount > 0 ? (
          <Link
            href="/careers"
            className="inline-flex min-h-11 items-center px-2 text-sm text-brand underline underline-offset-4"
          >
            Reset
          </Link>
        ) : null}
      </div>
    </form>
  );
}
