import Link from "next/link";
import type { MyReviewSummary } from "@/lib/db/reviews";
import { card } from "./styles";
import { courseHref } from "@/lib/routes";

const STATUS_LABEL: Record<MyReviewSummary["status"], string> = {
  draft: "Draft, not published",
  pending_verification: "Waiting for us to verify you",
  live: "Live",
  removed: "Removed by a moderator",
};

export function MyReviewsList({ reviews }: { reviews: MyReviewSummary[] }) {
  return (
    <ul className="mt-4 space-y-4">
      {reviews.map((review) => {
        const waitingOnOffering = review.status === "live" && review.offering.status === "pending";
        return (
          <li key={review.id} className={card}>
            <p className="font-semibold text-foreground">{review.offering.course.title}</p>
            <p className="text-sm text-muted-foreground">
              {review.offering.professor} · {review.offering.term_label},{" "}
              {review.offering.cohort_year}
              {review.on_behalf_of_name ? ` · for ${review.on_behalf_of_name}` : ""}
            </p>
            <p className="mt-1 text-sm text-foreground">
              {waitingOnOffering
                ? "Waiting for us to confirm the professor and term"
                : STATUS_LABEL[review.status]}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-4">
              {review.status !== "removed" ? (
                <Link
                  href={`/write/course-review?review=${review.id}`}
                  className="inline-flex min-h-11 items-center font-medium text-brand underline underline-offset-4"
                >
                  {review.status === "draft" ? "Continue writing" : "Edit or delete"}
                </Link>
              ) : null}
              {review.status === "live" && !waitingOnOffering ? (
                <Link
                  href={`${courseHref(review.offering.course.code)}#review-${review.id}`}
                  className="inline-flex min-h-11 items-center text-brand underline underline-offset-4"
                >
                  See it on the course page
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
