import Link from "next/link";
import { deleteCareerEntry } from "@/app/(app)/write/career-actions";
import type { MyCareerEntry } from "@/lib/db/careers";
import { functionLabel, trackShort } from "@/lib/domain/careers";
import { ActionButton } from "./action-button";
import { card } from "./styles";

const STATUS_LABEL: Record<MyCareerEntry["status"], string> = {
  draft: "Draft, not published",
  pending_verification: "Waiting for us to verify you",
  live: "Live",
  removed: "Removed by a moderator",
};

function titleOf(e: MyCareerEntry): string {
  if (e.type === "playbook")
    return `${functionLabel(e.from_function).split(" / ")[0]} → ${trackShort(e.track)}`;
  const b = e.body as { role?: string; year?: string };
  return [e.company, b.role, b.year].filter(Boolean).join(" · ");
}

export function MyCareerEntriesList({ entries }: { entries: MyCareerEntry[] }) {
  return (
    <ul className="mt-4 space-y-4">
      {entries.map((e) => (
        <li key={e.id} className={card}>
          <p className="type-label text-muted-foreground">
            {e.type === "playbook" ? "Track playbook" : "Company note"}
          </p>
          <p className="mt-1 font-semibold text-foreground">{titleOf(e)}</p>
          <p className="mt-1 text-sm text-foreground">{STATUS_LABEL[e.status]}</p>
          <div className="mt-1 flex flex-wrap items-start gap-x-4">
            {e.status === "live" ? (
              <Link
                href={`/careers/${e.id}`}
                className="inline-flex min-h-11 items-center font-medium text-brand underline underline-offset-4"
              >
                View
              </Link>
            ) : null}
            {e.status !== "removed" ? (
              <Link
                href={`/write/${e.type === "playbook" ? "playbook" : "company-note"}?entry=${e.id}`}
                className="inline-flex min-h-11 items-center font-medium text-brand underline underline-offset-4"
              >
                Edit
              </Link>
            ) : null}
            <ActionButton
              action={deleteCareerEntry.bind(null, e.id)}
              confirmText="Delete this entry? Its questions and answers go too. This cannot be undone."
              className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4"
              pendingLabel="Deleting…"
            >
              Delete
            </ActionButton>
          </div>
        </li>
      ))}
    </ul>
  );
}
