import Link from "next/link";
import type { Banner, CourseSummary } from "@/lib/domain/aggregation";
import { offeringLabel } from "@/lib/domain/offering";
import type { PublicReview } from "@/lib/domain/publicReview";
import { CourseSummaryBlock } from "./course-summary";
import { ReviewBody } from "./review-body";
import { card, primaryButton } from "./styles";

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
  const showSwitch =
    current !== null &&
    props.currentProfessorCount >= MIN_REVIEWS_FOR_PROFESSOR_SWITCH &&
    props.currentProfessorCount < props.totalCount;

  return (
    <>
      <Link
        href="/courses"
        className="inline-flex min-h-11 items-center text-sm text-brand underline underline-offset-4"
      >
        All courses
      </Link>

      <header className="mt-1">
        <h1 className="type-title">{course.title}</h1>
        <p className="mt-1 text-muted-foreground">
          {course.code}
          {current ? ` · ${current.professor}, ${current.term_label} ${current.cohort_year}` : ""}
        </p>
        {course.hiddenFromReaders ? (
          <p className="mt-2 text-sm font-medium text-destructive">
            Hidden from readers. Only moderators can see this page.
          </p>
        ) : null}
      </header>

      {banner ? <NewOrChangedBanner banner={banner} writeHref={writeHref} /> : null}

      {props.totalCount > 0 ? (
        <>
          {showSwitch ? (
            <nav aria-label="Which reviews" className="mt-5 flex gap-2">
              <ScopeLink href={`/courses/${course.id}`} active={scope === "all"}>
                All reviews ({props.totalCount})
              </ScopeLink>
              <ScopeLink href={`/courses/${course.id}?prof=current`} active={scope === "current"}>
                {current.professor} only ({props.currentProfessorCount})
              </ScopeLink>
            </nav>
          ) : null}

          <div className="mt-5">
            <CourseSummaryBlock summary={summary} />
          </div>

          <section id="reviews" aria-labelledby="reviews-heading" className="mt-8 scroll-mt-4">
            <h2 id="reviews-heading" className="type-heading">
              {scope === "current" && current
                ? `Reviews of ${current.professor}’s offerings`
                : "All reviews"}
            </h2>
            <ul className="mt-3 space-y-4">
              {reviews.map((review) => (
                <li key={review.id} id={`review-${review.id}`} className={`${card} scroll-mt-4`}>
                  <p className="mb-3 flex flex-wrap gap-x-2 text-sm text-muted-foreground">
                    <span>{formatMonth(review.published_at)}</span>
                    {review.is_edited ? <span>· edited</span> : null}
                    {review.is_mine ? (
                      <span className="font-medium text-brand">· Your review</span>
                    ) : null}
                  </p>
                  <ReviewBody
                    fields={review}
                    offeringLabel={offeringLabel(review)}
                    authorDisplay={review.author_display}
                  />
                  {review.entered_by_team ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Entered by the ISB Hood team from a conversation with the author, with their
                      consent.
                    </p>
                  ) : null}
                  {props.afterReview?.(review)}
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}

      <div className="sticky bottom-0 -mx-4 mt-8 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Link href={writeHref} className={primaryButton}>
          {props.myReviewId ? "Edit your review" : "Took this course? Add your review"}
        </Link>
      </div>
    </>
  );
}

function NewOrChangedBanner({
  banner,
  writeHref,
}: {
  banner: NonNullable<Banner>;
  writeHref: string;
}) {
  if (banner.kind === "new") {
    return (
      <div role="status" className="mt-5 rounded-md border border-brand bg-card p-4">
        <p className="font-semibold text-foreground">No reviews yet</p>
        <p className="mt-1 text-sm text-foreground">
          Nobody has reviewed this course here yet.{" "}
          <Link href={writeHref} className="font-medium text-brand underline underline-offset-4">
            Took it? Write the first one.
          </Link>
        </p>
      </div>
    );
  }
  const { reviewedFor, current } = banner;
  return (
    <div role="status" className="mt-5 rounded-md border border-warn bg-card p-4">
      <p className="font-semibold text-foreground">New or changed course</p>
      <p className="mt-1 text-sm text-foreground">
        Reviews below are for {reviewedFor.professor} ({reviewedFor.term_label},{" "}
        {reviewedFor.cohort_year}). This term it is taught by {current.professor}, so workload and
        grading may differ.
      </p>
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
