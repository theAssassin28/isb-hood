import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DemoStartPanel } from "@/components/demo-start";
import { EmailSignIn } from "@/components/email-sign-in";
import { PhoneLegalLinks } from "@/components/legal-links";
import { card, cardFrame, secondaryButton } from "@/components/styles";
import { isDemo } from "@/lib/demo/mode";
import { safeNextPath } from "@/lib/auth/access";

export const metadata: Metadata = { title: "Sign in · ISB Hood" };

/** From the team's research (docs/source/extracted/deck_slides.txt, slide 2). */
const research = [
  { figure: "20", label: "interviews with students and alumni" },
  { figure: "17 of 20", label: "raised choosing courses" },
  { figure: "12 of 20", label: "raised career prep" },
];

const team = ["Shivam", "Chinmay", "Rajashree", "Auro"];

export default function SignInPage({ searchParams }: PageProps<"/signin">) {
  const prototype = isDemo();
  return (
    // Phones: the title, then sign-in right away (the one action on this screen
    // must be in the first view), then the project facts. In the prototype the
    // persona panel comes first: it is how a tester gets in. 1024px and up: the
    // story (and persona panel) on the left, the sign-in panel on the right.
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:grid-rows-[auto_auto_auto_1fr] lg:items-start lg:gap-x-16">
      <div className="lg:col-start-1 lg:row-start-1">
        <h1 className="type-title">What earlier batches learned, with reasons</h1>
        <p className="mt-3 text-foreground/80">
          Course reviews and career paths from ISB seniors and alumni, kept for the batch after
          them.
        </p>
      </div>

      {prototype ? (
        <div className="mt-8 lg:col-start-1 lg:row-start-2">
          <DemoStartPanel />
        </div>
      ) : null}

      <div className="mt-8 lg:sticky lg:top-8 lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:mt-0">
        <section aria-labelledby="signin-heading" className={card}>
          <h2 id="signin-heading" className="type-heading">
            {prototype ? "Or sign in with an email" : "Sign in"}
          </h2>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            With your ISB email. No password: we email you a 6-digit code.
          </p>
          {/* An email link passes ?next=, read at request time. */}
          <Suspense fallback={<EmailSignIn intent="reader" prototype={prototype} />}>
            <SignIn searchParams={searchParams} prototype={prototype} />
          </Suspense>
        </section>

        {prototype ? (
          <p className="mt-3 text-sm text-muted-foreground">
            <span className="type-status text-warn">Prototype</span> Any 6-digit code works. A
            persona&rsquo;s email (for example{" "}
            <span className="text-foreground">ananya.kulkarni@isb.edu</span>) signs in as them; any
            other address starts as a new student.
          </p>
        ) : null}

        <section aria-labelledby="alum-heading" className={`${cardFrame} mt-8 p-6`}>
          <h2 id="alum-heading" className="type-heading">
            Alum without an ISB email?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in with any email to write a review. We check your name against the alumni list
            before it is published.
          </p>
          <Link href="/contribute" className={`${secondaryButton} mt-5 w-full`}>
            Sign in as a contributor
          </Link>
        </section>
      </div>

      <div className="mt-10 lg:col-start-1 lg:row-start-3 lg:mt-8">
        <div className="flex flex-wrap gap-2">
          <span className="type-tag">Student-led</span>
          <span className="type-tag">Software Product Management · Group 12</span>
        </div>
        <p className="mt-4 max-w-xl text-sm text-muted-foreground">
          ISB is one year long, so each batch leaves before it can pass on what it learned.
        </p>
        <dl className="mt-4 grid grid-cols-3 divide-x divide-border border-y border-border">
          {research.map((r) => (
            <div key={r.label} className="px-3 py-4 first:pl-0">
              <dt className="sr-only">{r.label}</dt>
              <dd className="font-display text-xl leading-tight text-foreground">{r.figure}</dd>
              <dd className="mt-1 text-sm leading-snug text-muted-foreground">{r.label}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-8 space-y-2 text-sm text-muted-foreground lg:col-start-1 lg:row-start-4 lg:max-w-xl">
        <p>Built by ISB Hyderabad students: {team.join(", ")}. Hyderabad campus, PGP and PGP YL.</p>
        <p>We never ask for grades, salaries or offer amounts.</p>
      </div>
      <div className="lg:col-start-1">
        <PhoneLegalLinks />
      </div>
    </div>
  );
}

async function SignIn({
  searchParams,
  prototype,
}: {
  searchParams: PageProps<"/signin">["searchParams"];
  prototype: boolean;
}) {
  const next = safeNextPath((await searchParams).next);
  return (
    <>
      <EmailSignIn intent="reader" next={next} prototype={prototype} />
      {next ? (
        <p className="mt-6 border-t border-border pt-4 text-sm text-foreground">
          Wrote a review with your own email as an alum?{" "}
          <Link
            href={`/contribute?next=${encodeURIComponent(next)}`}
            className="font-medium text-brand underline underline-offset-4"
          >
            Sign in with that email
          </Link>
        </p>
      ) : null}
    </>
  );
}
