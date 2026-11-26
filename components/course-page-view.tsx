import Link from "next/link";
import type { Banner, CourseSummary } from "@/lib/domain/aggregation";
import { offeringLabel } from "@/lib/domain/offering";
import { courseHref } from "@/lib/routes";
import type { PublicReview } from "@/lib/domain/publicReview";
import { CourseSummaryBlock } from "./course-summary";
import { ReviewBody } from "./review-body";
import { cardFrame, primaryButtonInline, quietAction, textAction } from "./styles";

// The course page (docs/BUILD_PLAN.md 4.4), given its data. No data access
// here, so it can be rendered from fixtures in tests.

export type CoursePageViewProps = {
  course: { id: string; code: string; title: string; hiddenFromReaders: boolean };
  current: { professor: string; term_label: string; cohort_year: string } | null;
  banner: Banner;
  summary: CourseSummary;
  /** Reviews in the chosen scope, newest first. */
  reviews: PublicReview[];
  scope: "all" | "current";
  totalCount: number;
  currentProfessorCount: number;
  myReviewId: string | null;
  openReviewId?: string | null;
  /** Rendered under each review: questions, answers and the flag button. */
  afterReview?: (review: PublicReview) => React.ReactNode;
};

/** The "This professor only" switch appears once there are 3+ reviews of them. */
export const MIN_REVIEWS_FOR_PROFESSOR_SWITCH = 3;

const formatMonth = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("en-IN", {
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }).format(new Date(iso))
    : "";

export function CoursePageView(props: CoursePageViewProps) {
  const { course, current, banner, summary, reviews, scope } = props;
  const writeHref = props.myReviewId
    ? `/write/course-review?review=${props.myReviewId}`
    : `/write/course-review?course=${course.id}`;
  const writeLabel = props.myReviewId ? "Edit your review" : "Add your review";
  const showSwitch =
    current !== null &&
    props.currentProfessorCount >= MIN_REVIEWS_FOR_PROFESSOR_SWITCH &&
    props.currentProfessorCount < props.totalCount;

  return (
    <>
      <nav
        aria-label="Course shortcuts"
        className="flex w-full max-w-4xl flex-wrap items-center justify-between gap-x-3"
      >
        <Link href="/courses" className={textAction}>
          <span aria-hidden="true" className="mr-2">
            ←
          </span>{" "}
          All courses
        </Link>
        {reviews.length > 0 ? (
          <a href="#reviews" className={textAction}>
            Read {reviews.length === 1 ? "the review" : `all ${reviews.length} reviews`}
            <span aria-hidden="true" className="ml-1.5">
              ↓
            </span>
          </a>
        ) : null}
      </nav>

      <div className="w-full max-w-4xl">
        <header className="mt-1">
          <h1 className="type-title">{course.title}</h1>
          <p className="mt-2 text-muted-foreground">
            {course.code}
            {current ? ` · ${current.professor}, ${current.term_label} ${current.cohort_year}` : ""}
          </p>
          {course.hiddenFromReaders ? (
            <p className="mt-2 text-sm font-medium text-destructive">
              Hidden from readers. Only moderators can see this page.
            </p>
          ) : null}
        </header>

        {banner?.kind === "new" ? (
          <div className={`${cardFrame} mt-5 p-5`}>
            <h2 className="type-heading">No reviews yet</h2>
            <p className="mt-1 text-muted-foreground">Nobody has reviewed this course here yet.</p>
            <Link href={writeHref} className={`${primaryButtonInline} mt-4`}>
              {writeLabel}
            </Link>
          </div>
        ) : null}

        {banner?.kind === "changed" ? (
          <div className="mt-5 rounded-md border border-warn bg-card px-4 py-3">
            <p className="font-semibold text-foreground">New or changed course</p>
            <p className="mt-1 max-w-[75ch] text-sm text-foreground">
              {summary.offeringCount === 1
                ? `Reviews below are for ${banner.reviewedFor.professor} (${banner.reviewedFor.term_label}, ${banner.reviewedFor.cohort_year}).`
                : "The reviews below describe earlier offerings."}{" "}
              Workload and grading may differ with {banner.current.professor}.
            </p>
          </div>
        ) : null}

        {reviews.length > 0 ? (
          <>
            <div className="mt-4">
              <CourseSummaryBlock
                summary={summary}
                evidenceScope={
                  current
                    ? `${props.currentProfessorCount} of ${props.totalCount} reviews for ${current.professor}`
                    : null
                }
              />
            </div>

            <section
              id="reviews"
              tabIndex={-1}
              aria-labelledby="reviews-heading"
              className="mt-5 scroll-mt-24"
            >
              <h2 id="reviews-heading" className="type-heading">
                {scope === "current" && current
                  ? `Reviews of ${current.professor}’s offerings`
                  : "All reviews"}
              </h2>
              {showSwitch ? (
                <nav aria-label="Which reviews" className="mt-2 flex flex-wrap gap-2">
                  <ScopeLink href={courseHref(course.code)} active={scope === "all"}>
                    All reviews ({props.totalCount})
                  </ScopeLink>
                  <ScopeLink
                    href={`${courseHref(course.code)}?prof=current`}
                    active={scope === "current"}
                  >
                    {current.professor} only ({props.currentProfessorCount})
                  </ScopeLink>
                </nav>
              ) : null}
              <ul className="mt-3 space-y-3">
                {reviews.map((review) => (
                  <li
                    key={review.id}
                    id={`review-${review.id}`}
                    className={`${cardFrame} scroll-mt-24 px-4 pt-4 sm:px-6 sm:pt-5`}
                  >
                    <ReviewPreview review={review} />
                    <details open={props.openReviewId === review.id} className="group mt-2">
                      <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-sm text-sm font-medium text-brand [&::-webkit-details-marker]:hidden">
                        <span className="group-open:hidden">Read full review</span>
                        <span className="hidden group-open:inline">Hide full review</span>
                        <span className="sr-only"> by {review.author_display}</span>
                        <span
                          aria-hidden="true"
                          className="size-1.5 rotate-45 border-r border-b border-current group-open:rotate-[225deg]"
                        />
                      </summary>
                      <div className="border-t border-border pt-4 pb-4">
                        <ReviewBody fields={review} />
                        {props.afterReview?.(review)}
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
              <Link href={writeHref} className={`${quietAction} mt-3`}>
                {writeLabel}
              </Link>
            </section>
          </>
        ) : null}
      </div>
    </>
  );
}

function ReviewPreview({ review }: { review: PublicReview }) {
  const reason =
    review.outline_gap ||
    review.who_should_take ||
    review.learning_value_reason ||
    review.who_should_skip;
  const cut = reason.length > 280 ? reason.lastIndexOf(" ", 280) : -1;
  const excerpt =
    reason.length > 280 ? `${reason.slice(0, cut > 0 ? cut : 280).trimEnd()}…` : reason;

  return (
    <div>
      <h3 className="font-semibold text-foreground">{review.author_display}</h3>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {offeringLabel(review)}
        {review.published_at ? ` · Posted ${formatMonth(review.published_at)}` : ""}
        {review.is_edited ? " · Edited" : ""}
        {review.is_mine ? " · Your review" : ""}
      </p>
      {excerpt ? (
        <blockquote className="mt-3 max-w-[75ch] border-l-2 border-input pl-3 leading-relaxed break-words whitespace-pre-line text-foreground">
          {excerpt}
        </blockquote>
      ) : null}
      {review.entered_by_team ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Entered by the ISB Hood team from a conversation with the author, with their consent.
        </p>
      ) : null}
    </div>
  );
}

function ScopeLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm ${
        active ? "border-foreground bg-foreground text-background" : "border-input text-brand"
      }`}
    >
      {children}
    </Link>
  );
}
