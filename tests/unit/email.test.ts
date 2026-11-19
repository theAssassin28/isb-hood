import { describe, expect, it } from "vitest";
import {
  answerEmail,
  digestEmail,
  editRequestEmail,
  escapeHtml,
  moderatorQueueEmail,
  newCommentEmail,
  snippet,
  SNIPPET_CHARS,
} from "@/lib/email/templates";

const urls = { replyUrl: "https://hood.example/reply/abc", prefsUrl: "https://hood.example/me" };

describe("email templates", () => {
  it("escape what people typed in the HTML part", () => {
    const email = newCommentEmail({
      courseTitle: "Pricing",
      commenter: "Ravi <b>Menon</b>",
      body: '<script>alert("x")</script> & more',
      isQuestion: true,
      ...urls,
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).not.toContain("<b>Menon</b>");
    expect(email.html).toContain("&amp; more");
    // The plain-text part keeps the words as typed.
    expect(email.text).toContain('<script>alert("x")</script> & more');
  });

  it("say a question is a question, with the reply link and preferences link", () => {
    const email = newCommentEmail({
      courseTitle: "Pricing",
      commenter: "Ravi Menon, Co'27",
      body: "How heavy is the final?",
      isQuestion: true,
      ...urls,
    });
    expect(email.subject).toBe("A question about your Pricing review");
    expect(email.text).toContain("Ravi Menon, Co'27 asked you a question");
    expect(email.text).toContain(urls.replyUrl);
    expect(email.text).toContain(urls.prefsUrl);
  });

  it("word a reply differently from a question", () => {
    const email = newCommentEmail({
      courseTitle: "Pricing",
      commenter: "Meera",
      body: "Same here",
      isQuestion: false,
      ...urls,
    });
    expect(email.subject).toBe("New reply under your Pricing review");
  });

  it("name the answerer only as given (the caller passes 'The author' for anonymous entries)", () => {
    const email = answerEmail({
      courseTitle: "Pricing",
      answerer: "The author",
      question: "Is it curved?",
      answer: "Yes, tightly.",
      threadUrl: "https://hood.example/reply/q1",
      prefsUrl: urls.prefsUrl,
    });
    expect(email.text).toContain("The author answered your question about Pricing.");
    expect(email.text).toContain("Yes, tightly.");
  });

  it("shorten long comments", () => {
    const long = "word ".repeat(400);
    expect(snippet(long).length).toBeLessThanOrEqual(SNIPPET_CHARS);
    expect(snippet(long).endsWith("…")).toBe(true);
    expect(snippet("short")).toBe("short");
  });

  it("count digest updates in the subject", () => {
    const item = {
      kind: "comment" as const,
      courseTitle: "X",
      commenter: "A",
      body: "b",
      url: "u",
    };
    expect(digestEmail({ items: [item], prefsUrl: "p" }).subject).toBe("1 update on ISB Hood");
    expect(digestEmail({ items: [item, item], prefsUrl: "p" }).subject).toBe(
      "2 updates on ISB Hood",
    );
  });

  it("warn moderators when the oldest flag nears 24 hours", () => {
    expect(moderatorQueueEmail({ openItems: 2, oldestHours: 3, queueUrl: "q" }).subject).toBe(
      "Moderation: 2 waiting",
    );
    expect(moderatorQueueEmail({ openItems: 1, oldestHours: 21, queueUrl: "q" }).subject).toBe(
      "Moderation: 1 waiting, oldest 21h",
    );
  });

  it("list the flag reasons in an edit request, escaped", () => {
    const email = editRequestEmail({
      courseTitle: "Pricing",
      reasons: ["A personal remark about <faculty>"],
      editUrl: "e",
      rulesUrl: "r",
    });
    expect(email.html).toContain("&lt;faculty&gt;");
    expect(email.text).toContain("- A personal remark about <faculty>");
  });

  it("escape every special character", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });
});
