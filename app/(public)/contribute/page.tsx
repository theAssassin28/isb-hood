import type { Metadata } from "next";
import { Suspense } from "react";
import { GoogleSignIn } from "@/components/google-sign-in";
import { safeCampaign, safeCourseId } from "@/lib/auth/access";

export const metadata: Metadata = { title: "Share what you learned · ISB Hood" };

// Landing page for outreach links: /contribute?src=<campaign>&course=<courseId>
export default function ContributePage({ searchParams }: PageProps<"/contribute">) {
  return (
    <>
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
          <span className="font-medium text-brand">Any Google account works.</span> We check your
          name against our alumni list before your review is published.
        </li>
      </ul>

      <div className="mt-8">
        {/* The link's parameters are read at request time, so this part streams in. */}
        <Suspense fallback={<GoogleSignIn intent="contributor" />}>
          <ContributorSignIn searchParams={searchParams} />
        </Suspense>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        We never ask for grades, salaries or offer amounts.
      </p>
    </>
  );
}

async function ContributorSignIn({
  searchParams,
}: {
  searchParams: PageProps<"/contribute">["searchParams"];
}) {
  const params = await searchParams;
  return (
    <GoogleSignIn
      intent="contributor"
      src={safeCampaign(params.src)}
      course={safeCourseId(params.course)}
    />
  );
}
