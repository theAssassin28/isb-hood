import Link from "next/link";
import {
  careerSubtitle,
  careerTitle,
  matchReason,
  type PublicCareerEntry,
  type Reader,
} from "@/lib/domain/careers";
import { cardFrame } from "./styles";

/** A playbook ("Consulting → Product") or company note ("Amazon · PM · 2026") in a list. */
export function CareerCard({ entry, reader }: { entry: PublicCareerEntry; reader: Reader }) {
  const like = matchReason(entry, reader);
  return (
    <li className={cardFrame}>
      <Link href={`/careers/${entry.id}`} className="block rounded-lg p-5 hover:bg-background">
        <span className="type-label text-muted-foreground">
          {entry.type === "playbook" ? "Playbook" : "Company note"}
        </span>
        <span className="mt-1 block font-semibold text-foreground">{careerTitle(entry)}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{careerSubtitle(entry)}</span>
        <span className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="type-tag">{entry.author_display}</span>
          {like ? <span className="type-tag border-foreground text-foreground">{like}</span> : null}
          {entry.is_mine ? <span className="type-tag">Yours</span> : null}
        </span>
      </Link>
    </li>
  );
}
