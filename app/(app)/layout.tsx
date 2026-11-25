import Link from "next/link";
import { Suspense } from "react";
import { DesktopNav, MobileTabBar } from "@/components/app-nav";
import { DemoScriptDockForUser } from "@/components/demo-start";
import { shellWidth } from "@/components/styles";
import { ThemeToggle } from "@/components/theme-switch";
import { signOut } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";

// Shell for signed-in screens. The header is static; anything that reads the
// session sits behind a Suspense boundary. Access is checked by each page,
// not here: layouts do not re-run on navigation.
//
// Phones: brand and sign-out on top, sections in a bottom tab bar.
// 1024px and up: one header row with the sections and a search pill.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className={`${shellWidth} flex min-h-16 items-center justify-between gap-4`}>
          <Link href="/" className="type-heading inline-flex min-h-11 shrink-0 items-center">
            ISB Hood
          </Link>
          <HeaderSearch />
          <div className="flex shrink-0 items-center gap-1">
            <Suspense fallback={null}>
              <AccountMenu />
            </Suspense>
            <ThemeToggle />
          </div>
        </div>
      </header>
      {children}
      {/* Outside the header: its backdrop blur would pin a fixed bar to the header. */}
      <Suspense fallback={null}>
        <PhoneTabs />
      </Suspense>
      {/* Prototype only: the persona's demo script, on demand. */}
      <Suspense fallback={null}>
        <DemoScriptDockForUser />
      </Suspense>
    </>
  );
}

/** A pill-shaped course search in the header, 1024px and up. A plain GET form. */
function HeaderSearch() {
  return (
    <form
      action="/courses"
      method="get"
      role="search"
      className="hidden min-w-0 flex-1 justify-center lg:flex"
    >
      <label htmlFor="header-search" className="sr-only">
        Search courses
      </label>
      <div className="flex min-h-12 w-full max-w-md items-center rounded-full border border-border bg-card pr-0.5 pl-5 focus-within:border-input">
        <input
          id="header-search"
          name="q"
          type="search"
          placeholder="Search a course or professor"
          className="min-h-11 w-full min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Search"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-background active:translate-y-px"
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="m20 20-4.2-4.2" />
          </svg>
        </button>
      </div>
    </form>
  );
}

async function AccountMenu() {
  const user = await getCurrentUser();
  if (!user) return null;
  const isModerator = user.profile.role === "moderator";
  return (
    <>
      <nav aria-label="Sections" className="flex items-center gap-1">
        <DesktopNav isModerator={isModerator} />
        <form action={signOut}>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </form>
      </nav>
    </>
  );
}

async function PhoneTabs() {
  const user = await getCurrentUser();
  if (!user) return null;
  return <MobileTabBar isModerator={user.profile.role === "moderator"} />;
}
