import Link from "next/link";
import { snoozeSurvey } from "@/app/(app)/survey/actions";
import { getMySurveyStatus, isSnoozed } from "@/lib/db/surveys";
import type { Survey } from "@/lib/domain/surveys";
import { primaryButtonInline } from "./styles";

const COPY: Record<Survey, { title: string; body: string; href: string }> = {
  post_bid: {
    title: "Two questions about your bids",
    body: "Bidding is over. Did ISB Hood change anything? It takes under a minute and decides whether this continues.",
    href: "/survey/post-bid",
  },
  career_followup: {
    title: "One question about career entries",
    body: "Did anything you read here lead you to do something? One line is enough.",
    href: "/survey/career",
  },
};

/** In-app survey prompt (docs/BUILD_PLAN.md 4.9). Renders nothing unless a survey is due. */
export async function SurveyPrompt() {
  const status = await getMySurveyStatus();
  const due: Survey[] = [];
  for (const survey of ["post_bid", "career_followup"] as const) {
    if (status[survey] && !(await isSnoozed(survey))) due.push(survey);
  }
  if (due.length === 0) return null;

  return (
    <div className="space-y-3">
      {due.map((survey) => (
        <section
          key={survey}
          aria-label={COPY[survey].title}
          className="rounded-md border border-brand bg-card p-4"
        >
          <p className="font-semibold text-foreground">{COPY[survey].title}</p>
          <p className="mt-1 text-sm text-foreground">{COPY[survey].body}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link href={COPY[survey].href} className={primaryButtonInline}>
              Answer now
            </Link>
            <form action={snoozeSurvey.bind(null, survey)}>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4"
              >
                Not now
              </button>
            </form>
          </div>
        </section>
      ))}
    </div>
  );
}
