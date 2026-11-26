"use client";

/**
 * The saved-theme script in <head>. The server sends a normal script, so it
 * runs before the first paint. If React ever builds this element in the
 * browser (it re-creates the root layout on some navigations), it gets
 * type="text/plain": the theme is already applied, and React only warns about
 * executable <script> tags it creates itself. suppressHydrationWarning keeps the
 * server's type during hydration.
 */
export function ThemeScript({ code }: { code: string }) {
  return (
    <script
      suppressHydrationWarning
      type={typeof window === "undefined" ? undefined : "text/plain"}
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
