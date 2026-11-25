import type { Metadata } from "next";
import { Suspense } from "react";
import { StackSkeleton } from "@/components/skeleton";
import { notice, pageColumn } from "@/components/styles";
import { TrackOnMount } from "@/components/track-on-mount";
import { requireReader } from "@/lib/auth/session";
import { listCoursesWithOfferings } from "@/lib/db/courses";
import { getSettings } from "@/lib/db/settings";
import { getMySurveyStatus } from "@/lib/db/surveys";
import { recordSurveyShown } from "../actions";
import { PostBidForm } from "./form";

export const metadata: Metadata = { title: "Your bids · ISB Hood" };

export default function PostBidSurveyPage() {
  return (
    <main className={pageColumn}>
      <h1 className="type-title">Your bids</h1>
      <p className="mt-2 text-foreground/80">
        Under a minute. Honest answers help most, including “no effect”.
      </p>
      <div className="mt-6">
        <Suspense fallback={<StackSkeleton label="Loading…" />}>
          <Survey />
        </Suspense>
      </div>
    </main>
  );
}

async function Survey() {
  await requireReader();
  const [status, settings, courses] = await Promise.all([
    getMySurveyStatus(),
    getSettings(),
    listCoursesWithOfferings(),
  ]);
  if (!status.post_bid) {
    return (
      <p className={notice}>
        This survey is closed, or you have already answered it. Thank you either way.
      </p>
    );
  }
  const bidCourses = (courses ?? [])
    .filter((c) =>
      c.offerings.some(
        (o) => o.is_current && o.status === "approved" && o.term_label === settings.bid_term_label,
      ),
    )
    .map((c) => ({ id: c.id, title: c.title, code: c.code }));

  return (
    <>
      <TrackOnMount action={recordSurveyShown.bind(null, "post_bid")} />
      <PostBidForm courses={bidCourses} bidTerm={settings.bid_term_label} />
    </>
  );
}
