"use client";

import { useEffect } from "react";
import { THEME_KEY } from "@/lib/theme";

// One icon button at the top: a moon in the light theme (tap for dark), a sun
// in the dark theme (tap for light). The page starts on the system setting;
// a tap saves a choice for this browser (THEME_SCRIPT in lib/theme.ts applies
// it before first paint). Picking the theme the system already wants clears
// the choice, so the page follows the system again.
//
// Which icon shows is decided by CSS (.theme-when-dark / .theme-when-light in
// globals.css), so the server and the browser render the same markup.

function systemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/** Page colours of the two themes, for the phone's address bar. */
const BAR = { light: "#f4f6f9", dark: "#0e1116" } as const;

/**
 * The layout sets two theme-color tags, one per system setting. With a manual
 * choice both show the chosen theme; without one each goes back to its own.
 */
function syncAddressBar() {
  const forced = document.documentElement.dataset.theme as "light" | "dark" | undefined;
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const own = (meta.getAttribute("media") ?? "").includes("light") ? "light" : "dark";
    const colour = BAR[forced ?? own];
    // Only write on a real change, so the observer below does not loop.
    if (meta.getAttribute("content") !== colour) meta.setAttribute("content", colour);
  }
}

function toggle() {
  const root = document.documentElement;
  const current = (root.dataset.theme as "light" | "dark" | undefined) ?? systemTheme();
  const next = current === "dark" ? "light" : "dark";
  try {
    if (next === systemTheme()) localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, next);
  } catch {
    // Storage blocked: the change still applies to this page.
  }
  if (next === systemTheme()) delete root.dataset.theme;
  else root.dataset.theme = next;
  syncAddressBar();
}

const icon = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function ThemeToggle() {
  // A saved choice is applied before paint (THEME_SCRIPT); match the bar to it.
  // Next rewrites the theme-color tags on navigation, so watch <head> and
  // re-apply. (No usePathname: it would block prerendering of every page.)
  useEffect(() => {
    syncAddressBar();
    const observer = new MutationObserver(syncAddressBar);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["content"],
    });
    return () => observer.disconnect();
  }, []);
  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-card hover:text-foreground active:translate-y-px"
    >
      <span className="theme-when-dark">
        <span className="sr-only">Switch to light theme</span>
        <svg {...icon}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
        </svg>
      </span>
      <span className="theme-when-light">
        <span className="sr-only">Switch to dark theme</span>
        <svg {...icon}>
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        </svg>
      </span>
    </button>
  );
}
