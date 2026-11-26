import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CareerCard } from "@/components/career-card";
import { CareersClosed } from "@/components/careers-closed";
import { card, notice, pageWide } from "@/components/styles";
import { requireReader } from "@/lib/auth/session";
import { TRACKS } from "@/lib/constants/vocab";
import { listCareerEntries } from "@/lib/db/careers";
import { getSettings } from "@/lib/db/settings";
import {
  buildPathway,
  matchesBackground,
  trackShort,
  type PublicCareerEntry,
  type Reader,
  type StageLine,
} from "@/lib/domain/careers";
import { careersOpenTo, careerWritingOpenTo } from "@/lib/domain/settings";

export const metadata: Metadata = { title: "Career pathway · ISB Hood" };

// Track pathway: every playbook for one track, lined up by stage, so a reader
// sees what people did at each point and whether it is too late for them.
export default function TrackPathwayPage({ params }: PageProps<"/careers/tracks/[track]">) {
  return (
    <main className={pageWide}>
      <div className="w-full max-w-2xl">
        <Link
          href="/careers"
          className="inline-flex min-h-11 items-center text-sm text-brand underline underline-offset-4"
        >
          All careers
        </Link>
        <Suspense fallback={<p className="text-muted-foreground">Loading the pathway…</p>}>
          <Pathway params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function Pathway({ params }: { params: PageProps<"/careers/tracks/[track]">["params"] }) {
  const { profile } = await requireReader();
  const [{ track }, settings, entries] = await Promise.all([
    params,
    getSettings(),
    listCareerEntries(),
  ]);
  if (!TRACKS.some((t) => t.value === track)) notFound();
  if (!careersOpenTo(profile, settings)) return <CareersClosed />;
  if (!entries) {
    return (
      <p role="alert" className={notice}>
        This pathway could not be loaded. Reload the page to try again.
      </p>
    );
  }

  const p = buildPathway(track, entries);
  const name = trackShort(track);
  const byId = new Map<string, PublicCareerEntry>(entries.map((e) => [e.id, e]));
  const canWrite = careerWritingOpenTo(profile, settings);
  const n = p.playbooks.length;

  return (
    <>
      <header className="mt-1">
        <h1 className="type-title">{name} pathway</h1>
        <p className="mt-2 text-foreground/80">
          {n === 0
            ? `No one has written a path into ${name.toLowerCase()} yet.`
            : `${n} ${n === 1 ? "person’s path" : "people’s paths"} into ${name.toLowerCase()}${
                p.notes.length
                  ? `, and ${p.notes.length} company note${p.notes.length === 1 ? "" : "s"}`
                  : ""
              }.`}
          {profile.target_track === track ? " This is your target track." : ""}
        </p>
      </header>

      {n === 0 ? (
        <div className={`${notice} mt-6`}>
          <p>
            When alumni who moved into {name.toLowerCase()} write their playbooks, this page lines
            up what each of them did in every term.
          </p>
          {canWrite ? (
            <Link
              href={`/write/playbook?track=${track}`}
              className="mt-2 inline-flex min-h-11 items-center font-medium text-brand underline underline-offset-4"
            >
              Made this move? Write the first playbook
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <section aria-labelledby="glance-heading" className={`${card} mt-6`}>
            <h2 id="glance-heading" className="type-heading">
              At a glance
            </h2>

            <h3 className="type-label mt-4 text-muted-foreground">Came from</h3>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {p.backgrounds.map((b) => (
                <li key={b.label} className="type-tag">
                  {b.label} · {b.count}
                </li>
              ))}
            </ul>

            <h3 className="type-label mt-5 text-muted-foreground">Typical numbers (median)</h3>
            <dl className="mt-1.5 grid grid-cols-4 gap-2">
              {p.funnel.map((f) => (
                <div key={f.label} className="rounded-md border border-border p-2 text-center">
                  <dt className="text-xs text-muted-foreground">{f.label}</dt>
                  <dd className="mt-0.5 text-lg font-semibold text-foreground">{f.band}</dd>
                </div>
              ))}
            </dl>

            <h3 className="type-label mt-5 text-muted-foreground">What mattered most</h3>
            <ul className="mt-1.5 space-y-2">
              {p.mattered.map((m) => (
                <li key={m.value}>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">{m.label}</span>
                    <span className="text-muted-foreground">
                      {m.count} of {n}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-border" aria-hidden>
                    <div
                      className="h-1.5 rounded-full bg-foreground"
                      style={{ width: `${Math.round((m.count / n) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="stages-heading" className="mt-10">
            <h2 id="stages-heading" className="type-heading">
              Stage by stage
            </h2>
            <ol className="mt-4 space-y-6 border-l border-border pl-5">
              {p.stages.map((stage) => (
                <li key={stage.key} className="relative">
                  <span
                    className="absolute top-1.5 -left-[25px] size-2.5 rounded-full bg-foreground"
                    aria-hidden
                  />
                  <h3 className="font-semibold text-foreground">{stage.label}</h3>
                  {stage.lines.length === 0 ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Nobody wrote about this stage.
                    </p>
                  ) : (
                    <Lines lines={stage.lines} byId={byId} reader={profile} />
                  )}
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="late-heading" className="mt-10">
            <h2 id="late-heading" className="type-heading">
              Am I too late?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The latest safe start, in their words.
            </p>
            <Lines lines={p.latestSafeStart} byId={byId} reader={profile} />
          </section>

          <section aria-labelledby="mistakes-heading" className="mt-10">
            <h2 id="mistakes-heading" className="type-heading">
              Mistakes to avoid
            </h2>
            <Lines lines={p.mistakes} byId={byId} reader={profile} />
          </section>

          <section aria-labelledby="paths-heading" className="mt-10">
            <h2 id="paths-heading" className="type-heading">
              Full playbooks
            </h2>
            <ul className="mt-3 space-y-4">
              {p.playbooks.map((e) => (
                <CareerCard key={e.id} entry={e} reader={profile} />
              ))}
            </ul>
          </section>
        </>
      )}

      {p.notes.length > 0 ? (
        <section aria-labelledby="notes-heading" className="mt-10">
          <h2 id="notes-heading" className="type-heading">
            Company notes
          </h2>
          <ul className="mt-3 space-y-4">
            {p.notes.map((e) => (
              <CareerCard key={e.id} entry={e} reader={profile} />
            ))}
          </ul>
        </section>
      ) : null}

      {canWrite && n > 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          Made this move too?{" "}
          <Link
            href={`/write/playbook?track=${track}`}
            className="font-medium text-brand underline underline-offset-4"
          >
            Add your playbook
          </Link>
          .
        </p>
      ) : null}
    </>
  );
}

function Lines({
  lines,
  byId,
  reader,
}: {
  lines: StageLine[];
  byId: Map<string, PublicCareerEntry>;
  reader: Reader;
}) {
  return (
    <ul className="mt-2 space-y-3">
      {lines.map((line) => {
        const entry = byId.get(line.entryId);
        const like = entry ? matchesBackground(entry, reader) : false;
        return (
          <li key={line.entryId} className="text-sm">
            <p className="text-foreground">{line.text}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-muted-foreground">
              <Link
                href={`/careers/${line.entryId}`}
                className="text-brand underline underline-offset-4"
              >
                {line.from}
              </Link>
              <span>{line.author}</span>
              {like ? <span className="type-tag">Like you</span> : null}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
