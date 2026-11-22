import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoPersonas } from "@/components/demo-personas";
import { isDemo } from "@/lib/demo/mode";

export const metadata: Metadata = { title: "Sample accounts · ISB Hood" };

/** Prototype only: jump straight in as one of the people in lib/demo/seed-data.ts. */
export default function SampleAccountsPage() {
  if (!isDemo()) notFound();
  return (
    <>
      <h1 className="type-title">Sample accounts</h1>
      <p className="mt-3 text-foreground/80">
        Continue as someone here, or sign in with their email and any 6-digit code. Walkthroughs for
        each are in docs/PERSONAS.md.
      </p>

      <section aria-labelledby="seekers" className="mt-8">
        <h2 id="seekers" className="type-heading">
          Looking for advice
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Juniors reading reviews before they decide.
        </p>
        <DemoPersonas side="seeker" />
      </section>

      <section aria-labelledby="contributors" className="mt-10">
        <h2 id="contributors" className="type-heading">
          Sharing what they learned
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Seniors, alumni and classmates who write and answer.
        </p>
        <DemoPersonas side="contributor" />
      </section>

      <section aria-labelledby="more" className="mt-10 border-t border-border pt-10">
        <h2 id="more" className="type-heading">
          More sample accounts
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Other states of the app: PGP YL, anonymous authors, verification, moderation, first visit.
        </p>
        <DemoPersonas side="other" />
      </section>

      <p className="mt-8 text-sm text-muted-foreground">
        <Link href="/signin" className="font-medium text-brand underline underline-offset-4">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
