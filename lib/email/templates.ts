// Email bodies (docs/BUILD_PLAN.md 4.7, 6.6). Pure functions: no sending here.
// Plain text first, with a minimal HTML twin: plain mail from a Gmail address
// is what lands in inboxes rather than promotions or spam.
// Everything people typed is escaped before it goes into HTML.

export type Email = { subject: string; text: string; html: string };

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Quote at most this many characters of someone's comment in an email. */
export const SNIPPET_CHARS = 500;

export function snippet(text: string): string {
  const clean = text.trim().replace(/\s+\n/g, "\n");
  return clean.length <= SNIPPET_CHARS ? clean : `${clean.slice(0, SNIPPET_CHARS - 1).trimEnd()}…`;
}

const FOOTER_TEXT = (prefsUrl: string) =>
  `\n\n--\nISB Hood, what earlier batches learned.\nChoose instant, daily or no emails: ${prefsUrl}`;

const FOOTER_HTML = (prefsUrl: string) =>
  `<p style="margin-top:24px;color:#666;font-size:13px">ISB Hood, what earlier batches learned.<br>` +
  `<a href="${escapeHtml(prefsUrl)}">Choose instant, daily or no emails</a></p>`;

function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function quote(text: string): string {
  return `<blockquote style="margin:12px 0;padding:8px 12px;border-left:3px solid #28B2AE;color:#222">${escapeHtml(
    snippet(text),
  ).replace(/\n/g, "<br>")}</blockquote>`;
}

function button(href: string, label: string): string {
  return `<p><a href="${escapeHtml(href)}" style="display:inline-block;padding:10px 16px;background:#192890;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(label)}</a></p>`;
}

/** To an entry's author: someone asked a question, or replied in a thread on their entry. */
export function newCommentEmail(args: {
  courseTitle: string;
  commenter: string;
  body: string;
  isQuestion: boolean;
  replyUrl: string;
  prefsUrl: string;
}): Email {
  const what = args.isQuestion ? "asked you a question" : "replied in a thread";
  const subject = args.isQuestion
    ? `A question about your ${args.courseTitle} review`
    : `New reply under your ${args.courseTitle} review`;
  const intro = `${args.commenter} ${what} under your review of ${args.courseTitle}:`;
  const close = args.isQuestion
    ? "Your answer is public, so it helps everyone who reads the review after them."
    : "";
  return {
    subject,
    text:
      `${intro}\n\n"${snippet(args.body)}"\n\nReply here: ${args.replyUrl}` +
      (close ? `\n\n${close}` : "") +
      FOOTER_TEXT(args.prefsUrl),
    html:
      paragraphs(intro) +
      quote(args.body) +
      button(args.replyUrl, args.isQuestion ? "Answer the question" : "See the thread") +
      (close ? paragraphs(close) : "") +
      FOOTER_HTML(args.prefsUrl),
  };
}

/** To the person who asked: the entry's author answered. */
export function answerEmail(args: {
  courseTitle: string;
  /** "Asha Rao" or, for an anonymous entry, "The author". */
  answerer: string;
  question: string;
  answer: string;
  threadUrl: string;
  prefsUrl: string;
}): Email {
  const intro = `${args.answerer} answered your question about ${args.courseTitle}.`;
  return {
    subject: `Your question about ${args.courseTitle} has an answer`,
    text:
      `${intro}\n\nYou asked: "${snippet(args.question)}"\n\nAnswer: "${snippet(args.answer)}"` +
      `\n\nSee the thread: ${args.threadUrl}` +
      FOOTER_TEXT(args.prefsUrl),
    html:
      paragraphs(intro) +
      `<p style="margin-bottom:0">You asked:</p>` +
      quote(args.question) +
      `<p style="margin-bottom:0">Answer:</p>` +
      quote(args.answer) +
      button(args.threadUrl, "See the thread") +
      FOOTER_HTML(args.prefsUrl),
  };
}

export type DigestItem =
  | { kind: "comment"; courseTitle: string; commenter: string; body: string; url: string }
  | { kind: "answer"; courseTitle: string; answerer: string; body: string; url: string };

/** Once a day, for people who chose the daily digest. */
export function digestEmail(args: { items: DigestItem[]; prefsUrl: string }): Email {
  const n = args.items.length;
  const line = (item: DigestItem) =>
    item.kind === "comment"
      ? `${item.commenter} on your ${item.courseTitle} review`
      : `${item.answerer} answered your question about ${item.courseTitle}`;
  return {
    subject: n === 1 ? "1 update on ISB Hood" : `${n} updates on ISB Hood`,
    text:
      args.items
        .map((item) => `- ${line(item)}:\n  "${snippet(item.body)}"\n  ${item.url}`)
        .join("\n\n") + FOOTER_TEXT(args.prefsUrl),
    html:
      args.items
        .map(
          (item) =>
            `<p style="margin-bottom:0"><strong>${escapeHtml(line(item))}</strong></p>` +
            quote(item.body) +
            `<p><a href="${escapeHtml(item.url)}">Open</a></p>`,
        )
        .join("") + FOOTER_HTML(args.prefsUrl),
  };
}

/** To moderators, daily, when the flag queue is not empty. */
export function moderatorQueueEmail(args: {
  openItems: number;
  oldestHours: number;
  queueUrl: string;
}): Email {
  const late = args.oldestHours >= 20;
  const body =
    `${args.openItems} flagged item${args.openItems === 1 ? " is" : "s are"} waiting. ` +
    `The oldest has waited ${args.oldestHours} hour${args.oldestHours === 1 ? "" : "s"}` +
    (late ? ", close to or past the 24-hour promise." : ".");
  return {
    subject: late
      ? `Moderation: ${args.openItems} waiting, oldest ${args.oldestHours}h`
      : `Moderation: ${args.openItems} waiting`,
    text: `${body}\n\nOpen the queue: ${args.queueUrl}`,
    html: paragraphs(body) + button(args.queueUrl, "Open the queue"),
  };
}

/** To an author, when a moderator asks them to change something. */
export function editRequestEmail(args: {
  courseTitle: string;
  reasons: string[];
  editUrl: string;
  rulesUrl: string;
}): Email {
  const intro = `A reader flagged your review of ${args.courseTitle}, and a moderator agrees it needs a change before it can stay up.`;
  const reasons = args.reasons.map((r) => `- ${r}`).join("\n");
  const close =
    "Please edit it in the next two days. If it is not changed, a moderator may take it down. The content rules explain what is and is not allowed.";
  return {
    subject: `Please edit your ${args.courseTitle} review`,
    text: `${intro}\n\nWhat was flagged:\n${reasons}\n\n${close}\n\nEdit your review: ${args.editUrl}\nContent rules: ${args.rulesUrl}`,
    html:
      paragraphs(intro) +
      `<p style="margin-bottom:0">What was flagged:</p><ul>${args.reasons
        .map((r) => `<li>${escapeHtml(r)}</li>`)
        .join("")}</ul>` +
      paragraphs(close) +
      button(args.editUrl, "Edit your review") +
      `<p><a href="${escapeHtml(args.rulesUrl)}">Content rules</a></p>`,
  };
}

/** Survey invitation and its one reminder (plan 4.9). */
export function surveyEmail(args: {
  survey: "post_bid" | "career_followup";
  reminder: boolean;
  url: string;
  prefsUrl: string;
}): Email {
  const copy =
    args.survey === "post_bid"
      ? {
          subject: args.reminder
            ? "Reminder: two questions about your bids"
            : "Two questions about your bids",
          body: "Bidding is over. Did ISB Hood change any of your bids? It takes under a minute, and “no effect” is a useful answer too. Your answers decide whether ISB Hood carries on for the next batch.",
          cta: "Answer now",
        }
      : {
          subject: args.reminder
            ? "Reminder: did a career entry help?"
            : "Did a career entry help?",
          body: "A couple of weeks ago you read a career entry on ISB Hood. Did it lead you to do anything? One line is enough, and “nothing yet” is a useful answer too.",
          cta: "Answer one question",
        };
  const last = args.reminder ? "\n\nThis is the only reminder; we will not ask again." : "";
  return {
    subject: copy.subject,
    text: `${copy.body}\n\n${copy.cta}: ${args.url}${last}` + FOOTER_TEXT(args.prefsUrl),
    html:
      paragraphs(copy.body) +
      button(args.url, copy.cta) +
      (args.reminder ? paragraphs("This is the only reminder; we will not ask again.") : "") +
      FOOTER_HTML(args.prefsUrl),
  };
}
