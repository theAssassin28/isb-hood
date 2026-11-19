import Link from "next/link";
import { Suspense } from "react";
import {
  card,
  cardFrame,
  fieldInput,
  notice,
  pageColumn,
  primaryButton,
  primaryButtonInline,
} from "@/components/styles";
import { SurveyPrompt } from "@/components/survey-prompt";
import { requireProfile } from "@/lib/auth/session";
import { getSettings } from "@/lib/db/settings";
import { coursesOpenTo } from "@/lib/domain/settings";

// Home (docs/BUILD_PLAN.md 4.3).
export default function HomePage() {
  return (
    <main className={pageColumn}>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <Home />
      </Suspense>
    </main>
  );
}

async function Home() {
  const { profile, shell } = await requireProfile();
  const firstName = profile.full_name?.trim().split(/\s+/)[0] ?? "there";

  if (shell === "rejected") {
    return (
      <>
        <h1 className="type-title">We could not verify you</h1>
        <p className="mt-3 text-foreground/80">
          We could not match your name to our ISB alumni list, so your entries are not published. If
          this is a mistake, reply to the message that brought you here and we will fix it.
        </p>
      </>
    );
  }

  if (shell === "limited") {
    return (
      <>
        <h1 className="type-title">Thanks, {firstName}</h1>
        <p className="mt-3 text-foreground/80">
          We are checking your name against our alumni list. This is done by hand and usually takes
          less than a day.
        </p>
        <ul className="mt-6 space-y-3">
          <li className={card}>
            <h2 className="font-semibold text-foreground">You can write now</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Anything you write is saved and goes live as soon as you are verified.
            </p>
          </li>
          <li className={card}>
            <h2 className="font-semibold text-foreground">Reading opens after verification</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Other people’s reviews are for ISB students and verified alumni only.
            </p>
          </li>
        </ul>
        <Link href="/write" className={`${primaryButton} mt-6`}>
          Write a course review
        </Link>
      </>
    );
  }

  const settings = await getSettings();
  const canReadCourses = coursesOpenTo(profile, settings);

  return (
    <>
      <h1 className="type-title">Hello, {firstName}</h1>
      <p className="mt-3 text-foreground/80">
        What earlier batches learned about courses and careers, with reasons, and the author one
        question away.
      </p>

      <div className="mt-6 empty:hidden">
        <SurveyPrompt />
      </div>

      {canReadCourses ? (
        <form action="/courses" method="get" role="search" className="mt-6 flex gap-2">
          <label htmlFor="home-search" className="sr-only">
            Search courses
          </label>
          <input
            id="home-search"
            name="q"
            type="search"
            placeholder="Search a course or professor"
            className={fieldInput}
          />
          <button type="submit" className={primaryButtonInline}>
            Search
          </button>
        </form>
      ) : null}

      <ul className="mt-6 space-y-3">
        <li className={cardFrame}>
          {canReadCourses ? (
            <Link href="/courses" className="block rounded-lg p-5 hover:bg-background">
              <span className="block font-semibold text-foreground">Courses</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Workload, grading and teaching style by professor and term, from people who took the
                course.
              </span>
            </Link>
          ) : (
            <div className="p-4">
              <p className="font-semibold text-foreground">Courses</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Course reviews open to PGP YL students soon.
              </p>
            </div>
          )}
        </li>
        <li className={`${card}`}>
          <p className="font-semibold text-foreground">Careers</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Term-by-term paths and company notes from people who made the same move from your
            background. Opening soon.
          </p>
        </li>
      </ul>

      <Link href="/write" className={`${primaryButton} mt-6`}>
        Write a course review
      </Link>
      <p className={`${notice} mt-4`}>
        Took a course others are bidding for? Five minutes from you saves the next batch hours.
      </p>
    </>
  );
}
