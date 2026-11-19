// Question-and-answer threads under an entry (docs/BUILD_PLAN.md 4.7). Pure.

export type PublicComment = {
  id: string;
  entry_type: "course_review" | "career_entry";
  entry_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  first_reply_at: string | null;
  is_entry_author: boolean;
  /** "Ravi Menon, Co'27", "Author" on an anonymous entry, or "Former member". */
  author_display: string;
  is_mine: boolean;
};

export type Thread = { question: PublicComment; replies: PublicComment[] };

const oldestFirst = (a: PublicComment, b: PublicComment) =>
  a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);

/** Groups comments into threads per entry. Replies whose question is gone are dropped. */
export function buildThreads(comments: PublicComment[]): Map<string, Thread[]> {
  const questions = comments.filter((c) => c.parent_id === null).sort(oldestFirst);
  const byQuestion = new Map<string, PublicComment[]>();
  for (const reply of comments.filter((c) => c.parent_id !== null).sort(oldestFirst)) {
    byQuestion.set(reply.parent_id!, [...(byQuestion.get(reply.parent_id!) ?? []), reply]);
  }
  const threads = new Map<string, Thread[]>();
  for (const question of questions) {
    const list = threads.get(question.entry_id) ?? [];
    list.push({ question, replies: byQuestion.get(question.id) ?? [] });
    threads.set(question.entry_id, list);
  }
  return threads;
}

/** Hours from question to first author reply, to one decimal (plan 8.1). */
export function hoursToAnswer(askedAt: string, answeredAt: Date): number {
  const hours = (answeredAt.getTime() - new Date(askedAt).getTime()) / 3_600_000;
  return Math.max(0, Math.round(hours * 10) / 10);
}

/** Questions on the reader's own entries that still wait for them. */
export function waitingForMe(threads: Thread[]): Thread[] {
  return threads.filter(
    (t) => t.question.first_reply_at === null && !t.question.is_mine && !t.question.is_entry_author,
  );
}

export function isAnswered(thread: Thread): boolean {
  return thread.question.first_reply_at !== null || thread.replies.some((r) => r.is_entry_author);
}
