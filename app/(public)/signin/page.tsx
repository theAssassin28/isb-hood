import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DemoPersonas } from "@/components/demo-personas";
import { EmailSignIn } from "@/components/email-sign-in";
import { isDemo } from "@/lib/demo/mode";
import { safeNextPath } from "@/lib/auth/access";

export const metadata: Metadata = { title: "Sign in · ISB Hood" };

export default function SignInPage({ searchParams }: PageProps<"/signin">) {
  if (isDemo()) {
    return (
      <>
        <h1 className="type-title">Choose who you are</h1>
        <p className="mt-3 text-foreground/80">
          This is a demo with sample people and reviews. Pick someone to see ISB Hood through their
          eyes; switch any time from the strip at the top.
        </p>
        <div className="mt-6">
          <DemoPersonas />
        </div>
      </>
    );
  }
  return (
    <>
      <h1 className="type-title">What earlier batches learned, with reasons</h1>
      <p className="mt-2 text-foreground/80">
        Course reviews and career paths written by ISB seniors and alumni. Ask the author when an
        entry does not cover your case.
      </p>

      <div className="mt-8">
        {/* An email link passes ?next=, read at request time. */}
        <Suspense fallback={<EmailSignIn intent="reader" />}>
          <SignIn searchParams={searchParams} />
        </Suspense>
      </div>

      <p className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
        Alum without an ISB email?{" "}
        <Link href="/contribute" className="font-medium text-brand underline underline-offset-4">
          Sign in as a contributor
        </Link>
        .
      </p>
    </>
  );
}

async function SignIn({ searchParams }: { searchParams: PageProps<"/signin">["searchParams"] }) {
  const next = safeNextPath((await searchParams).next);
  return (
    <>
      <EmailSignIn intent="reader" next={next} />
      <p className="mt-3 text-sm text-muted-foreground">
        Use your ISB email address. We email you a code; no password needed.
      </p>
      {next ? (
        <p className="mt-6 text-sm text-foreground">
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
