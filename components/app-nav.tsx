"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Signed-in navigation. Phones get a bottom tab bar (thumb reach, always
// visible); from 1024px the same links sit in the header. The current section
// is white, the others muted; both are links, so neither spends the accent.

type Tab = { href: string; label: string; icon: React.ReactNode; match: (path: string) => boolean };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" {...stroke}>
    {children}
  </svg>
);

const TABS: Tab[] = [
  {
    href: "/",
    label: "Home",
    match: (p) => p === "/",
    icon: (
      <Icon>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9v11h14V9" />
      </Icon>
    ),
  },
  {
    href: "/courses",
    label: "Courses",
    match: (p) => p.startsWith("/courses"),
    icon: (
      <Icon>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m20 20-4.2-4.2" />
      </Icon>
    ),
  },
  {
    href: "/write",
    label: "Write",
    match: (p) => p.startsWith("/write"),
    icon: (
      <Icon>
        <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
        <path d="m13.5 6.5 4 4" />
      </Icon>
    ),
  },
  {
    href: "/me",
    label: "Activity",
    match: (p) => p.startsWith("/me"),
    icon: (
      <Icon>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </Icon>
    ),
  },
];

const ADMIN: Tab = {
  href: "/admin/moderation",
  label: "Admin",
  match: (p) => p.startsWith("/admin"),
  icon: (
    <Icon>
      <path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6z" />
    </Icon>
  ),
};

function useTabs(isModerator: boolean) {
  const path = usePathname() ?? "/";
  const tabs = isModerator ? [...TABS, ADMIN] : TABS;
  return tabs.map((t) => ({ ...t, active: t.match(path) }));
}

/** Header links, 1024px and up. */
export function DesktopNav({ isModerator }: { isModerator: boolean }) {
  const tabs = useTabs(isModerator);
  return (
    <ul className="hidden items-center gap-1 lg:flex">
      {tabs.map((t) => (
        <li key={t.href}>
          <Link
            href={t.href}
            aria-current={t.active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium hover:bg-card ${
              t.active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label === "Write"
              ? "Write a review"
              : t.label === "Activity"
                ? "My activity"
                : t.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Bottom tab bar, phones only. The page keeps room for it (app/globals.css). */
export function MobileTabBar({ isModerator }: { isModerator: boolean }) {
  const tabs = useTabs(isModerator);
  // With the tab bar, the page scrolls inside <body> (app/globals.css), which
  // Next does not reset on navigation. Start each new page at the top, unless
  // the link points at a place on the page (#reviews).
  const path = usePathname();
  useEffect(() => {
    if (window.location.hash) return;
    const frame = requestAnimationFrame(() => document.body.scrollTo({ top: 0 }));
    return () => cancelAnimationFrame(frame);
  }, [path]);
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto flex max-w-xl">
        {tabs.map((t) => (
          <li key={t.href} className="flex-1">
            <Link
              href={t.href}
              aria-current={t.active ? "page" : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-sm ${
                t.active ? "font-medium text-foreground" : "text-muted-foreground"
              }`}
            >
              {t.icon}
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
