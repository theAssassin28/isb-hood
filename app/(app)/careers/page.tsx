import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CareerCard } from "@/components/career-card";
import { CareerFilters } from "@/components/career-filters";
import { CareersClosed } from "@/components/careers-closed";
import { FakeDoor } from "@/components/fake-door";
import { cardFrame, notice, pageWide } from "@/components/styles";
import { TrackOnMount } from "@/components/track-on-mount";
import { requireReader } from "@/lib/auth/session";
import { listCareerEntries } from "@/lib/db/careers";
import { getSettings } from "@/lib/db/settings";
import {
  activeFilterNames,
  companiesIn,
  filterCareerEntries,
  functionLabel,
  industryLabel,
  parseCareerFilters,
  trackCounts,
} from "@/lib/domain/careers";
import { careersOpenTo, careerWritingOpenTo } from "@/lib/domain/settings";
import { recordCareerFilters } from "./actions";

export const metadata: Metadata = { title: "Careers · ISB Hood" };

// Career list (docs/BUILD_PLAN.md 4.6): pathways by track, then every playbook
// and company note with filters and "Like me".
export default function CareersPage({ searchParams }: PageProps<"/careers">) {
  return (
    <main className={pageWide}>
      <h1 className="type-title">Careers</h1>
      <p className="mt-2 max-w-2xl text-foreground/80">
        How people from your background moved into a track, term by term, and what each company’s
        process was like.
      </p>
      <div className="mt-6">
        <Suspense fallback={<p className="text-muted-foreground">Loading careers…</p>}>
          <Careers searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function Careers({ searchParams }: { searchParams: PageProps<"/careers">["searchParams"] }) {
  const { profile } = await requireReader();
  const [params, settings, entries] = await Promise.all([
    searchParams,
    getSettings(),
    listCareerEntries(),
  ]);
  if (!careersOpenTo(profile, settings)) return <CareersClosed />;
  if (!entries) {
    return (
      <p role="alert" className={notice}>
        Career entries could not be loaded. Reload the page to try again.
      </p>
    );
  }

  const canWrite = careerWritingOpenTo(profile, settings);
  const filters = parseCareerFilters(params);
  const chosen = activeFilterNames(filters);
  const shown = filterCareerEntries(entries, filters, profile);
  const canLikeMe = !!(profile.background_function || profile.background_industry);
  const tracks = trackCounts(entries);

  return (
    <div className="space-y-10">
      {chosen.length > 0 ? (
        <TrackOnMount
          key={JSON.stringify(params)}
          action={recordCareerFilters.bind(null, chosen)}
        />
      ) : null}

      <section aria-labelledby="pathways-heading">
        <h2 id="pathways-heading" className="type-heading">
          Pathways by track
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What everyone who made it into a track did at each stage, side by side.
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {tracks.map((t) => {
            const empty = t.playbooks + t.notes === 0;
            return (
              <li key={t.track} className={cardFrame}>
                <Link
                  href={`/careers/tracks/${t.track}`}
                  className="flex h-full min-h-24 flex-col justify-between rounded-lg p-4 hover:bg-background"
                >
                  <span className="font-semibold text-foreground">{t.label}</span>
                  <span className="mt-2 text-sm text-muted-foreground">
                    {empty
                      ? "Nothing yet"
                      : [
                          t.playbooks ? `${t.playbooks} path${t.playbooks === 1 ? "" : "s"}` : null,
                          t.notes ? `${t.notes} note${t.notes === 1 ? "" : "s"}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="entries-heading">
        <h2 id="entries-heading" className="type-heading">
          Playbooks and company notes
        </h2>
        <div className="mt-3 max-w-2xl">
          <CareerFilters
            filters={filters}
            companies={companiesIn(entries)}
            activeCount={chosen.filter((c) => c !== "like_me").length}
            canLikeMe={canLikeMe}
          />
        </div>

        {filters.likeMe ? (
          <p className="mt-4 text-sm text-foreground">
            Showing people who were in{" "}
            {[
              profile.background_function
                ? functionLabel(profile.background_function).toLowerCase()
                : null,
              profile.background_industry ? industryLabel(profile.background_industry) : null,
            ]
              .filter(Boolean)
              .join(" or ")}{" "}
            before ISB. People on your target track come first.
          </p>
        ) : null}

        <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
          {shown.length} of {entries.length} entries
        </p>

        {entries.length === 0 ? (
          <div className={`${notice} mt-3`}>
            <p>No career entries yet. Alumni are writing the first ones now.</p>
            {canWrite ? (
              <Link
                href="/write/playbook"
                className="mt-2 inline-flex min-h-11 items-center font-medium text-brand underline underline-offset-4"
              >
                Made a career move? Write your playbook
              </Link>
            ) : null}
          </div>
        ) : shown.length === 0 ? (
          <div className={`${notice} mt-3`}>
            <p>No entry matches these filters yet.</p>
            <Link
              href="/careers"
              className="mt-2 inline-flex min-h-11 items-center font-medium text-brand underline underline-offset-4"
            >
              Clear filters
            </Link>
          </div>
        ) : (
          <ul className="mt-3 grid gap-4 lg:grid-cols-2">
            {shown.map((entry) => (
              <CareerCard key={entry.id} entry={entry} reader={profile} />
            ))}
          </ul>
        )}

        <div className={`${notice} mt-6 max-w-2xl`}>
          <p className="text-foreground">
            Want to talk to people with your background, not just read them?
          </p>
          <div className="mt-1">
            <FakeDoor door="find_people" entryId={null} />
          </div>
        </div>
      </section>

      {canWrite ? (
        <p className="text-sm text-muted-foreground">
          Made a career move?{" "}
          <Link
            href="/write/playbook"
            className="font-medium text-brand underline underline-offset-4"
          >
            Write your playbook
          </Link>{" "}
          or{" "}
          <Link
            href="/write/company-note"
            className="font-medium text-brand underline underline-offset-4"
          >
            a company note
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
