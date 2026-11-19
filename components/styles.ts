// Shared class strings: Stella's colours with Kero's shapes (Godly Templates
// kit): pill buttons, 20px cards, 12px fields and alerts. Tokens live in
// app/globals.css. Tap targets are at least 44px (min-h-11), body text 16px.
// Focus rings come from the global :focus-visible rule. Only one thing moves:
// a 1px press on buttons.

const press = "active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45";

/** Primary (Stella colour, Kero pill): sky-blue fill, dark text. The one filled control on a screen. */
export const primaryButton = `inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-brand bg-brand px-5 text-base font-medium text-on-accent hover:opacity-86 ${press}`;

/** Primary button sized to its label, for a button beside an input. */
export const primaryButtonInline = primaryButton.replace("w-full", "w-auto shrink-0");

/** Secondary (Stella outline, Kero pill): transparent with an ink outline. */
export const secondaryButton = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-foreground bg-transparent px-5 text-base font-medium text-foreground hover:opacity-86 ${press}`;

export const dangerButton = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-critical bg-transparent px-5 text-base font-medium text-critical hover:opacity-86 ${press}`;

/** Quiet text action: a link-styled button in the accent. */
export const textAction =
  "inline-flex min-h-11 items-center text-sm font-medium text-brand underline underline-offset-4";

/** Quiet secondary text action (cancel, close, flag). */
export const quietAction =
  "inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground";

/** Stella field: page-colour fill, muted-ink border. */
export const fieldInput =
  "block min-h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground placeholder:text-muted-foreground aria-invalid:border-critical";

export const fieldLabel = "block text-sm font-medium text-foreground";

/** Card frame (Kero 20px corners, Stella surface): surface fill, hairline, no shadow, no padding. */
export const cardFrame = "rounded-lg border border-border bg-card";

/** Card with Kero padding. */
export const card = `${cardFrame} p-6`;

/** Quiet panel: same surface as a card. Notices, empty states. */
export const notice = "rounded-md border border-border bg-card p-4 text-sm text-foreground";

/** Stella alert: surface with a coloured edge. For something that asks for attention. */
export const callout = "rounded-md border border-brand bg-card p-4";

/** Stella alert, warning tone. */
export const warnCallout = "rounded-md border border-warn bg-card p-4";

export const errorBox = "rounded-md border border-critical bg-card p-3 text-sm text-foreground";

export const pageColumn = "mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pt-8 pb-12";

/** Page title: Kero serif, 32px on phones. */
export const pageTitle = "type-title";

/** Lead under a title, kept near 65 characters per line. */
export const pageLead = "mt-3 max-w-[65ch] text-base text-muted-foreground";

/** Section heading inside a page. */
export const sectionHeading = "type-heading";

/** Small label over a value or a group. */
export const sectionLabel = "type-label";
