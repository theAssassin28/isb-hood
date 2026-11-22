import Link from "next/link";
import { demoReset } from "@/lib/demo/actions";
import { isDemo } from "@/lib/demo/mode";

/** A slim strip on every page in demo mode: what this is, switch person, reset. */
export function DemoBanner() {
  if (!isDemo()) return null;
  return (
    <div role="note" className="border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-sm">
        <span className="type-status text-warn">Prototype with sample data</span>
        <Link
          href="/sample-accounts"
          className="inline-flex min-h-9 items-center font-medium text-brand underline underline-offset-4"
        >
          Sample accounts
        </Link>
        <form action={demoReset}>
          <button
            type="submit"
            className="inline-flex min-h-9 items-center text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Reset demo data
          </button>
        </form>
      </div>
    </div>
  );
}
