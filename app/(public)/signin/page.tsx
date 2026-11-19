import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GoogleSignIn } from "@/components/google-sign-in";
import { safeNextPath } from "@/lib/auth/access";

export const metadata: Metadata = { title: "Sign in · ISB Hood" };

export default function SignInPage({ searchParams }: PageProps<"/signin">) {
  return (
    <>
      <h1 className="type-title">What earlier batches learned, with reasons</h1>
      <p className="mt-2 text-foreground/80">
        Course reviews and career paths written by ISB seniors and alumni. Ask the author when an
        entry does not cover your case.
      </p>

      <div className="mt-8">
        {/* An email link passes ?next=, read at request time. */}
        <Suspense fallback={<GoogleSignIn intent="reader" />}>
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
      <GoogleSignIn intent="reader" next={next} />
      <p className="mt-3 text-sm text-muted-foreground">
        {next
          ? "Use the Google account you write on ISB Hood with."
          : "Use your ISB email address."}
      </p>
    </>
  );
}
