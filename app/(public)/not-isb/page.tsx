import type { Metadata } from "next";
import Link from "next/link";
import { primaryButton, secondaryButton } from "@/components/styles";

export const metadata: Metadata = { title: "ISB email needed · ISB Hood" };

export default function NotIsbPage() {
  return (
    <div className="mx-auto w-full max-w-xl">
      <h1 className="type-title">That was not an ISB email address</h1>
      <p className="mt-2 text-foreground/80">
        Reading ISB Hood needs an ISB account. We have not kept the account you just used.
      </p>

      <div className="mt-8 space-y-3">
        <Link href="/signin" className={primaryButton}>
          Try again with your ISB email
        </Link>
        <Link href="/contribute" className={`${secondaryButton} w-full`}>
          I am an alum and want to contribute
        </Link>
      </div>
    </div>
  );
}
