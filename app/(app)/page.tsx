import Link from "next/link";
import { Suspense } from "react";
import { HomeSkeleton } from "@/components/skeleton";
import {
  card,
  cardFrame,
  fieldInput,
  pageWide,
  primaryButton,
  secondaryButtonInline,
} from "@/components/styles";
import { SurveyPrompt } from "@/components/survey-prompt";
import { requireProfile } from "@/lib/auth/session";
import { getSettings } from "@/lib/db/settings";
import { coursesOpenTo } from "@/lib/domain/settings";

// Home (docs/BUILD_PLAN.md 4.3).
export default function HomePage() {
  return (
    <main className={pageWide}>
      <Suspense fallback={<HomeSkeleton />}>
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
      <div className="mx-auto w-full max-w-xl">
        <h1 className="type-title">We could not verify you</h1>
        <p className="mt-3 text-foreground/80">
          We could not match your name to our ISB alumni list, so your entries are not published. If
          this is a mistake, reply to the message that brought you here and we will fix it.
        </p>
      </div>
    );
  }

  if (shell === "limited") {
    return (
      <div className="mx-auto w-full max-w-xl">
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
      </div>
    );
  }

  const settings = await getSettings();
  const canReadCourses = coursesOpenTo(profile, settings);

  return (
    <>
      <section className="max-w-3xl">
        <h1 className="type-title">Hello, {firstName}</h1>
        <p className="mt-3 text-foreground/80">
          What earlier batches learned about courses and careers, with reasons, and the author one
          question away.
        </p>

        {canReadCourses ? (
          <form
            action="/courses"
            method="get"
            role="search"
            className="mt-6 flex max-w-2xl gap-2 lg:hidden"
          >
            <label htmlFor="home-search" className="sr-only">
              Search courses
            </label>
            <input
              id="home-search"
              name="q"
              type="search"
              placeholder="Search a course or professor"
              className={`${fieldInput} rounded-full px-5`}
            />
            <button type="submit" className={secondaryButtonInline}>
              Search
            </button>
          </form>
        ) : null}
      </section>

      <div className="mt-6 max-w-xl empty:hidden">
        <SurveyPrompt />
      </div>

      <ul className="mt-8 grid gap-4 lg:grid-cols-3">
        <li className={`${cardFrame} flex flex-col`}>
          {canReadCourses ? (
            <Link
              href="/courses"
              className="flex flex-1 flex-col rounded-lg p-6 hover:bg-background"
            >
              <span className="type-heading block">Courses</span>
              <span className="mt-2 block text-sm text-muted-foreground">
                Workload, grading and teaching style by professor and term, from people who took the
                course.
              </span>
              <span className="mt-auto pt-5 text-sm font-medium text-brand">Browse courses →</span>
            </Link>
          ) : (
            <div className="p-6">
              <p className="type-heading">Courses</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Course reviews open to PGP YL students soon.
              </p>
            </div>
          )}
        </li>
        <li className={`${card} flex flex-col`}>
          <p className="type-heading">Careers</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Term-by-term paths and company notes from people who made the same move from your
            background.
          </p>
          <span className="mt-auto pt-5 type-status text-muted-foreground">Opening soon</span>
        </li>
        <li className={`${card} flex flex-col`}>
          <p className="type-heading">Took a course others are bidding for?</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Five minutes from you saves the next batch hours.
          </p>
          <div className="mt-auto pt-5">
            <Link href="/write" className={primaryButton}>
              Write a course review
            </Link>
          </div>
        </li>
      </ul>
    </>
  );
}
