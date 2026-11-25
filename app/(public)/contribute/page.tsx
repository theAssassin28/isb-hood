import type { Metadata } from "next";
import { Suspense } from "react";
import { EmailSignIn } from "@/components/email-sign-in";
import { card } from "@/components/styles";
import { isDemo } from "@/lib/demo/mode";
import { safeCampaign, safeCourseId, safeNextPath } from "@/lib/auth/access";

export const metadata: Metadata = { title: "Share what you learned · ISB Hood" };

// Landing page for outreach links: /contribute?src=<campaign>&course=<courseId>
export default function ContributePage({ searchParams }: PageProps<"/contribute">) {
  return (
    // Phones: one column. 1024px and up: the pitch on the left, sign-in on the right.
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-start lg:gap-x-16">
      <div>
        <h1 className="type-title">What was the course really like?</h1>
        <p className="mt-2 text-foreground/80">
          Tell the next batch. You get asked the same questions every term; answer once here and it
          keeps helping.
        </p>

        <ul className="mt-6 space-y-3 text-foreground/90">
          <li>
            <span className="font-medium text-brand">About 5 minutes.</span> A short form: workload,
            grading, what the outline did not tell you, who should take it.
          </li>
          <li>
            <span className="font-medium text-brand">Your name is your choice.</span> Show it, or
            appear as “Verified Co’26 student”. The team can always see who wrote an entry.
          </li>
          <li>
            <span className="font-medium text-brand">Any email address works.</span> We email you a
            code to sign in, then check your name against our alumni list before your review is
            published.
          </li>
        </ul>
      </div>

      <div className="mt-8 lg:sticky lg:top-8 lg:mt-0">
        <section aria-labelledby="contrib-signin" className={card}>
          <h2 id="contrib-signin" className="type-heading">
            Sign in to write
          </h2>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Any email works. No password: we email you a 6-digit code.
          </p>
          {/* The link's parameters are read at request time, so this part streams in. */}
          <Suspense
            fallback={
              <EmailSignIn
                intent="contributor"
                placeholder="you@example.com"
                prototype={isDemo()}
              />
            }
          >
            <ContributorSignIn searchParams={searchParams} />
          </Suspense>
        </section>

        {isDemo() ? (
          <p className="mt-3 text-sm text-muted-foreground">
            <span className="type-status text-warn">Prototype</span> Any email and any 6-digit code
            work. A new address starts as an alum waiting for verification.
          </p>
        ) : null}

        <p className="mt-6 text-sm text-muted-foreground">
          We never ask for grades, salaries or offer amounts.
        </p>
      </div>
    </div>
  );
}

async function ContributorSignIn({
  searchParams,
}: {
  searchParams: PageProps<"/contribute">["searchParams"];
}) {
  const params = await searchParams;
  return (
    <EmailSignIn
      intent="contributor"
      src={safeCampaign(params.src)}
      course={safeCourseId(params.course)}
      next={safeNextPath(params.next)}
      placeholder="you@example.com"
      prototype={isDemo()}
    />
  );
}
