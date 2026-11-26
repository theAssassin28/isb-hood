import type { Metadata } from "next";
import { Suspense } from "react";
import { StackSkeleton } from "@/components/skeleton";
import { notice, pageColumn } from "@/components/styles";
import { TrackOnMount } from "@/components/track-on-mount";
import { requireReader } from "@/lib/auth/session";
import { getMySurveyStatus } from "@/lib/db/surveys";
import { recordSurveyShown } from "../actions";
import { CareerFollowupForm } from "./form";

export const metadata: Metadata = { title: "Career entries · ISB Hood" };

export default function CareerSurveyPage() {
  return (
    <main className={pageColumn}>
      <h1 className="type-title">Did a career entry help?</h1>
      <p className="mt-2 text-foreground/80">One question. “Nothing yet” is a useful answer too.</p>
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
  const status = await getMySurveyStatus();
  if (!status.career_followup) {
    return (
      <p className={notice}>
        This survey is not open for you, or you have already answered it. Thank you either way.
      </p>
    );
  }
  return (
    <>
      <TrackOnMount action={recordSurveyShown.bind(null, "career_followup")} />
      <CareerFollowupForm />
    </>
  );
}
