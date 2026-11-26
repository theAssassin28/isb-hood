import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MyCareerEntriesList } from "@/components/my-career-entries";
import { StackSkeleton } from "@/components/skeleton";
import { MyReviewsList } from "@/components/my-reviews";
import { SurveyPrompt } from "@/components/survey-prompt";
import { card, notice, pageColumn } from "@/components/styles";
import { requireWriter } from "@/lib/auth/session";
import { listMyCareerEntries } from "@/lib/db/careers";
import { listComments } from "@/lib/db/comments";
import { listMyReviews } from "@/lib/db/reviews";
import { buildThreads, waitingForMe } from "@/lib/domain/threads";
import { DeleteAccountForm, NotifyPrefForm } from "./settings-forms";
import { PhoneLegalLinks } from "@/components/legal-links";

export const metadata: Metadata = { title: "My activity · ISB Hood" };

export default function MyActivityPage({ searchParams }: PageProps<"/me">) {
  return (
    <main className={pageColumn}>
      <h1 className="type-title">My activity</h1>
      <div className="mt-6">
        <Suspense fallback={<StackSkeleton label="Loading…" />}>
          <Activity searchParams={searchParams} />
        </Suspense>
      </div>
      <PhoneLegalLinks />
    </main>
  );
}

async function Activity({ searchParams }: { searchParams: PageProps<"/me">["searchParams"] }) {
  const { profile } = await requireWriter();
  const [params, mine, careers] = await Promise.all([
    searchParams,
    listMyReviews(profile.id),
    listMyCareerEntries(profile.id),
  ]);

  const live = (mine ?? []).filter((r) => r.status === "live");
  const liveCareers = (careers ?? []).filter((e) => e.status === "live");
  const [reviewComments, careerComments] = await Promise.all([
    listComments(
      "course_review",
      live.map((r) => r.id),
    ),
    listComments(
      "career_entry",
      liveCareers.map((e) => e.id),
    ),
  ]);
  const comments =
    reviewComments === null || careerComments === null
      ? null
      : [...reviewComments, ...careerComments];
  const titleOf = new Map<string, string>([
    ...live.map((r) => [r.id, `${r.offering.course.title} review`] as [string, string]),
    ...liveCareers.map(
      (e) =>
        [e.id, e.type === "playbook" ? "playbook" : `${e.company ?? ""} note`] as [string, string],
    ),
  ]);
  const waiting = waitingForMe([...buildThreads(comments ?? []).values()].flat());

  return (
    <div className="space-y-10">
      {profile.account_type === "isb" || profile.verification_status === "verified" ? (
        <div className="empty:hidden">
          <SurveyPrompt />
        </div>
      ) : null}
      {params.gone === "1" ? (
        <p role="status" className={notice}>
          That comment is no longer available. It may have been deleted.
        </p>
      ) : null}

      <section aria-labelledby="waiting-heading">
        <h2 id="waiting-heading" className="type-heading">
          Questions waiting for you
        </h2>
        {comments === null ? (
          <p role="alert" className={`${notice} mt-3`}>
            Questions could not be loaded. Reload to try again.
          </p>
        ) : waiting.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            None right now. When a reader asks about one of your entries, it appears here and we
            email you.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {waiting.map(({ question }) => (
              <li key={question.id} className={card}>
                <p className="text-sm text-muted-foreground">
                  {question.author_display} on your {titleOf.get(question.entry_id) ?? "entry"}
                </p>
                <p className="mt-1 text-sm break-words whitespace-pre-line text-foreground">
                  {question.body}
                </p>
                <Link
                  href={`/reply/${question.id}`}
                  className="mt-1 inline-flex min-h-11 items-center font-medium text-brand underline underline-offset-4"
                >
                  Answer
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="reviews-heading">
        <h2 id="reviews-heading" className="type-heading">
          Your reviews
        </h2>
        {mine === null ? (
          <p role="alert" className={`${notice} mt-3`}>
            Your reviews could not be loaded. Reload to try again.
          </p>
        ) : mine.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            You have not written one yet.{" "}
            <Link href="/write" className="font-medium text-brand underline underline-offset-4">
              Write a course review
            </Link>
          </p>
        ) : (
          <MyReviewsList reviews={mine} />
        )}
      </section>

      {careers && careers.length > 0 ? (
        <section aria-labelledby="careers-heading">
          <h2 id="careers-heading" className="type-heading">
            Your career entries
          </h2>
          <MyCareerEntriesList entries={careers} />
        </section>
      ) : null}

      <section id="notifications" aria-labelledby="notify-heading" className="scroll-mt-4">
        <h2 id="notify-heading" className="type-heading">
          Email
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Sent to {profile.email}.</p>
        <div className="mt-3">
          <NotifyPrefForm current={profile.notify_pref} />
        </div>
      </section>

      <section aria-labelledby="delete-heading">
        <h2 id="delete-heading" className="type-heading">
          Delete your account
        </h2>
        <div className="mt-3">
          <DeleteAccountForm />
        </div>
      </section>
    </div>
  );
}
