import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmailSignIn } from "@/components/email-sign-in";
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
    <>
      <div className="flex flex-wrap gap-2">
        <span className="type-tag">Student-led</span>
        <span className="type-tag">Software Product Management · Group 12</span>
      </div>

      <h1 className="mt-5 type-title">What earlier batches learned, with reasons</h1>
      <p className="mt-3 text-foreground/80">
        ISB is one year long, so each batch leaves before it can pass on what it learned. ISB Hood
        keeps course reviews and career paths from seniors and alumni for the batch after them.
      </p>

      <dl className="mt-6 grid grid-cols-3 divide-x divide-border border-y border-border">
        {research.map((r) => (
          <div key={r.label} className="px-3 py-4 first:pl-0">
            <dt className="sr-only">{r.label}</dt>
            <dd className="font-display text-xl leading-tight text-foreground sm:text-2xl">
              {r.figure}
            </dd>
            <dd className="mt-1 text-sm leading-snug text-muted-foreground">{r.label}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="signin-heading" className={`${card} mt-8`}>
        <h2 id="signin-heading" className="type-heading">
          Sign in
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
          <span className="type-status text-warn">Prototype</span> Any 6-digit code works. Try{" "}
          <span className="text-foreground">ananya.kulkarni@isb.edu</span>, or{" "}
          <Link
            href="/sample-accounts"
            className="font-medium text-brand underline underline-offset-4"
          >
            see all sample accounts
          </Link>
          .
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

      <div className="mt-10 space-y-2 text-sm text-muted-foreground">
        <p>Built by ISB Hyderabad students: {team.join(", ")}. Hyderabad campus, PGP and PGP YL.</p>
        <p>We never ask for grades, salaries or offer amounts.</p>
      </div>
    </>
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
