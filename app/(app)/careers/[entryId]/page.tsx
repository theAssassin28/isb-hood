import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CareerEntryView } from "@/components/career-entry-view";
import { CareersClosed } from "@/components/careers-closed";
import { FakeDoor } from "@/components/fake-door";
import { FlagButton } from "@/components/flag-button";
import { ReviewThread } from "@/components/review-thread";
import { notice, pageWide } from "@/components/styles";
import { TrackOnMount } from "@/components/track-on-mount";
import { safeCourseId } from "@/lib/auth/access";
import { requireReader } from "@/lib/auth/session";
import { getCareerEntry, listEntryCourses } from "@/lib/db/careers";
import { listComments } from "@/lib/db/comments";
import { getSettings } from "@/lib/db/settings";
import { careersOpenTo } from "@/lib/domain/settings";
import { buildThreads } from "@/lib/domain/threads";
import { recordCareerView } from "../actions";

export const metadata: Metadata = { title: "Career entry · ISB Hood" };

export default function CareerEntryPage({ params, searchParams }: PageProps<"/careers/[entryId]">) {
  return (
    <main className={pageWide}>
      <div className="w-full max-w-2xl">
        <Link
          href="/careers"
          className="inline-flex min-h-11 items-center text-sm text-brand underline underline-offset-4"
        >
          All careers
        </Link>
        <Suspense fallback={<p className="text-muted-foreground">Loading the entry…</p>}>
          <Entry params={params} searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function Entry({
  params,
  searchParams,
}: {
  params: PageProps<"/careers/[entryId]">["params"];
  searchParams: PageProps<"/careers/[entryId]">["searchParams"];
}) {
  const { profile } = await requireReader();
  const [{ entryId: raw }, query, settings] = await Promise.all([
    params,
    searchParams,
    getSettings(),
  ]);
  if (!careersOpenTo(profile, settings)) return <CareersClosed />;
  const entryId = safeCourseId(raw);
  if (!entryId) notFound();
  const entry = await getCareerEntry(entryId);
  if (!entry) notFound();

  const [courses, comments] = await Promise.all([
    entry.type === "playbook" ? listEntryCourses([entry.id]) : Promise.resolve(new Map()),
    listComments("career_entry", [entry.id]),
  ]);
  const threads = buildThreads(comments ?? []);

  return (
    <>
      <TrackOnMount key={entry.id} action={recordCareerView.bind(null, entry.id)} />
      <CareerEntryView entry={entry} courses={courses.get(entry.id) ?? []} reader={profile} />

      {comments === null ? (
        <p className={`${notice} mt-6`}>Questions could not be loaded. Reload to try again.</p>
      ) : (
        <div className="mt-6">
          <ReviewThread
            entryType="career_entry"
            entryId={entry.id}
            threads={threads.get(entry.id) ?? []}
            openToQuestions={entry.open_to_questions}
            isMyEntry={entry.is_mine}
            openThreadId={safeCourseId(query.thread)}
          />
        </div>
      )}
      {entry.is_mine ? null : (
        <div className="mt-1 flex flex-wrap items-start justify-between gap-x-4">
          {entry.open_to_questions ? <FakeDoor door="request_chat" entryId={entry.id} /> : <span />}
          <FlagButton targetType="career_entry" targetId={entry.id} label="Flag this entry" />
        </div>
      )}
    </>
  );
}
