import Link from "next/link";

const linkClass =
  "inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground";

/** "Content rules" and "Privacy": the site footer on desktop. */
export function LegalLinks() {
  return (
    <>
      <Link href="/rules" className={linkClass}>
        Content rules
      </Link>
      <Link href="/privacy" className={linkClass}>
        Privacy
      </Link>
    </>
  );
}

/**
 * Phones only: the same links at the end of the sign-in page and My activity.
 * Elsewhere on phones the footer is hidden, so the page ends at its content
 * and the tab bar (see app/layout.tsx).
 */
export function PhoneLegalLinks() {
  return (
    <nav
      aria-label="About ISB Hood"
      className="mt-10 flex gap-4 border-t border-border pt-2 lg:hidden"
    >
      <LegalLinks />
    </nav>
  );
}
