import type { Metadata } from "next";
import Link from "next/link";
import { primaryButton } from "@/components/styles";

export const metadata: Metadata = { title: "Sign-in did not finish · ISB Hood" };

export default function SignInProblemPage() {
  return (
    <>
      <h1 className="type-title">Sign-in did not finish</h1>
      <p className="mt-2 text-foreground/80">
        Nothing was saved. This usually means the code had expired or the session expired. Try once
        more; if it keeps happening, tell the ISB Hood team.
      </p>
      <div className="mt-8">
        <Link href="/signin" className={primaryButton}>
          Back to sign in
        </Link>
      </div>
    </>
  );
}
