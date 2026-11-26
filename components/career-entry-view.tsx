import Link from "next/link";
import {
  careerSubtitle,
  careerTitle,
  companyTypeLabel,
  functionLabel,
  industryLabel,
  matchReason,
  matteredLabel,
  stageLabel,
  trackLabel,
  trackShort,
  type PublicCompanyNote,
  type PublicPlaybook,
  type Reader,
} from "@/lib/domain/careers";
import type { CompanyNoteBody, PlaybookBody } from "@/lib/schemas/careerEntry";
import { STAGE_KEYS } from "@/lib/schemas/careerEntry";
import { courseHref } from "@/lib/routes";
import { card } from "./styles";

// The body of a playbook or company note. No data access here: the entry page
// and the write-form preview both render it.

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="type-label text-muted-foreground">{title}</h2>
      <div className="mt-1.5 text-foreground">{children}</div>
    </section>
  );
}

const prose = "break-words whitespace-pre-line";

export function PlaybookBodyView({
  body,
  courses,
  linkCourses = true,
}: {
  body: PlaybookBody;
  courses: { id: string; code: string; title: string }[];
  linkCourses?: boolean;
}) {
  return (
    <>
      <div className={`${card} mt-6 grid grid-cols-2 gap-4`}>
        <div>
          <p className="type-label text-muted-foreground">From</p>
          <p className="mt-1 font-semibold text-foreground">{functionLabel(body.from.function)}</p>
          <p className="text-sm text-muted-foreground">
            {industryLabel(body.from.industry)} · {body.from.years_band} years
          </p>
        </div>
        <div>
          <p className="type-label text-muted-foreground">To</p>
          <p className="mt-1 font-semibold text-foreground">{trackLabel(body.to.track)}</p>
          <p className="text-sm text-muted-foreground">
            {body.to.role} · {body.to.company || companyTypeLabel(body.to.company_type)}
          </p>
        </div>
      </div>

      <Block title="Path by stage">
        <ol className="space-y-4 border-l border-border pl-5">
          {STAGE_KEYS.filter((k) => (body.path[k] ?? "").trim() !== "").map((k) => (
            <li key={k} className="relative">
              <span
                className="absolute top-1.5 -left-[25px] size-2.5 rounded-full bg-foreground"
                aria-hidden
              />
              <p className="font-semibold">{stageLabel(k)}</p>
              <p className={`mt-0.5 ${prose}`}>{body.path[k]}</p>
            </li>
          ))}
        </ol>
      </Block>

      <Block title="Numbers">
        <dl className="grid grid-cols-4 gap-2">
          {(
            [
              ["Applied", body.numbers.applied],
              ["Shortlists", body.numbers.shortlists],
              ["Interviews", body.numbers.interviews],
              ["Offers", body.numbers.offers],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-md border border-border p-2 text-center">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 text-lg font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </Block>

      <Block title="What mattered most">
        <ul className="flex flex-wrap gap-1.5">
          {body.what_mattered.picks.map((v) => (
            <li key={v} className="type-tag border-foreground text-foreground">
              {matteredLabel(v)}
            </li>
          ))}
        </ul>
        <p className={`mt-2 ${prose}`}>{body.what_mattered.why}</p>
      </Block>

      {courses.length > 0 ? (
        <Block title="Courses that helped">
          <ul className="space-y-1">
            {courses.map((c) => (
              <li key={c.id}>
                {linkCourses ? (
                  <Link
                    href={courseHref(c.code)}
                    className="inline-flex min-h-11 items-center text-brand underline underline-offset-4"
                  >
                    {c.title}
                  </Link>
                ) : (
                  <span className="font-medium">{c.title}</span>
                )}{" "}
                <span className="text-sm text-muted-foreground">{c.code}</span>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      <Block title="Latest safe start">
        <p className={prose}>{body.latest_safe_start}</p>
      </Block>
      <Block title="Mistakes to avoid">
        <p className={prose}>{body.mistakes_to_avoid}</p>
      </Block>
    </>
  );
}

const RECOMMEND_LABEL = { yes: "Yes", depends: "It depends", no: "No" } as const;

export function CompanyNoteBodyView({ body }: { body: CompanyNoteBody }) {
  return (
    <>
      <Block title="Process and rounds">
        <p className={prose}>{body.process_rounds}</p>
      </Block>
      <Block title="What was asked">
        <p className={prose}>{body.what_was_asked}</p>
      </Block>
      <Block title="Prep that worked">
        <p className={prose}>{body.prep_that_worked}</p>
      </Block>
      {body.relationship !== "interviewed" && body.culture_and_team ? (
        <Block title="Work culture and team">
          <p className={prose}>{body.culture_and_team}</p>
        </Block>
      ) : null}
      <Block title="Would they recommend it?">
        <p className="font-semibold">{RECOMMEND_LABEL[body.recommend]}</p>
        <p className={`mt-1 ${prose}`}>{body.recommend_to_whom}</p>
      </Block>
    </>
  );
}

const formatMonth = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("en-IN", {
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }).format(new Date(iso))
    : "";

/** Header and body of one entry, as the entry page and the preview show it. */
export function CareerEntryView({
  entry,
  courses,
  reader,
  preview = false,
}: {
  entry: PublicPlaybook | PublicCompanyNote;
  courses: { id: string; code: string; title: string }[];
  reader: Reader | null;
  /** In the write form's preview: no links that would leave the unsaved form. */
  preview?: boolean;
}) {
  const like = reader ? matchReason(entry, reader) : null;
  return (
    <article>
      <header className="mt-1">
        <p className="type-label text-muted-foreground">
          {entry.type === "playbook" ? "Track playbook" : "Company note"}
        </p>
        <h1 className="type-title mt-1">{careerTitle(entry)}</h1>
        <p className="mt-1 text-muted-foreground">{careerSubtitle(entry)}</p>
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{entry.author_display}</span>
          {entry.published_at ? <span>{formatMonth(entry.published_at)}</span> : null}
          {entry.is_edited ? <span>Edited</span> : null}
          {entry.entered_by_team ? <span>Entered by the ISB Hood team</span> : null}
          {like ? <span className="type-tag border-foreground text-foreground">{like}</span> : null}
        </p>
        {entry.track && !preview ? (
          <Link
            href={`/careers/tracks/${entry.track}`}
            className="mt-1 inline-flex min-h-11 items-center text-sm text-brand underline underline-offset-4"
          >
            See the whole {trackShort(entry.track).toLowerCase()} pathway
          </Link>
        ) : null}
      </header>

      {entry.type === "playbook" ? (
        <PlaybookBodyView body={entry.body} courses={courses} linkCourses={!preview} />
      ) : (
        <CompanyNoteBodyView body={entry.body} />
      )}
    </article>
  );
}
