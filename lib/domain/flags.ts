// Reasons a reader can give when flagging (docs/BUILD_PLAN.md 6.6). Shared.

export const FLAG_REASONS = [
  { value: "personal", label: "A personal remark about faculty, staff or students" },
  { value: "pay", label: "Mentions pay or offer amounts" },
  { value: "misleading", label: "False or misleading" },
  { value: "spam", label: "Spam or off-topic" },
  { value: "other", label: "Something else" },
] as const;

export type FlagReason = (typeof FLAG_REASONS)[number]["value"];

/** The text stored on the flag: the reason's label, plus the reader's note if any. */
export function flagText(reason: string, note: string): string | null {
  const found = FLAG_REASONS.find((r) => r.value === reason);
  if (!found) return null;
  const extra = note.trim().replace(/\s+/g, " ").slice(0, 300);
  return extra ? `${found.label}: ${extra}` : found.label;
}

/** Hours since a flag was raised; the queue turns red from this many. */
export const FLAG_LATE_HOURS = 20;
