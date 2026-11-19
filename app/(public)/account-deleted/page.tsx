import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Account deleted · ISB Hood" };

export default function AccountDeletedPage() {
  return (
    <>
      <h1 className="type-title">Your account is deleted</h1>
      <p className="mt-2 text-foreground/80">
        Your reviews and profile are gone, and your comments now read “deleted”. If this was a
        mistake, contact the ISB Hood team within a few days.
      </p>
      <Link
        href="/rules"
        className="mt-6 inline-flex min-h-11 items-center text-brand underline underline-offset-4"
      >
        Content rules
      </Link>
    </>
  );
}
