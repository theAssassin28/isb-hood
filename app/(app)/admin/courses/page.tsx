import type { Metadata } from "next";
import { Suspense } from "react";
import { StackSkeleton } from "@/components/skeleton";
import { ActionButton } from "@/components/action-button";
import { CsvImportForm } from "@/components/csv-import-form";
import { card, dangerButton, notice, pageColumn, secondaryButton } from "@/components/styles";
import { requireModerator } from "@/lib/auth/session";
import { listCoursesWithOfferings } from "@/lib/db/courses";
import { offeringLabel } from "@/lib/domain/offering";
import { siteUrl } from "@/lib/supabase/env";
import {
  approveOffering,
  deleteOffering,
  importCourses,
  makeCurrent,
  setOpenToReaders,
} from "./actions";

export const metadata: Metadata = { title: "Courses · ISB Hood admin" };

const smallButton = `${secondaryButton} min-h-11 px-3 text-sm`;

export default function AdminCoursesPage() {
  return (
    <main className={pageColumn}>
      <h1 className="type-title">Courses and offerings</h1>
      <p className="mt-2 text-foreground/80">
        An offering is one course taught by one professor in one term. Reviews attach to offerings,
        which is how a change of professor shows up.
      </p>

      <section className={`${card} mt-6`}>
        <h2 className="type-heading">Import</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One row per offering. Safe to run again: existing rows are updated, not duplicated. Mark
          this year’s offering as current.
        </p>
        <div className="mt-4">
          <CsvImportForm
            action={importCourses}
            columns="code, title, area, professor, term, cohort, current"
            example={
              "code,title,area,professor,term,cohort,current\nMKT-501,Pricing Strategy,Marketing,Prof A,Term 7,Co'26,no\nMKT-501,Pricing Strategy,Marketing,Prof B,Term 7,Co'27,yes"
            }
          />
        </div>
      </section>

      <div className="mt-8">
        <Suspense fallback={<StackSkeleton label="Loading courses…" />}>
          <Courses />
        </Suspense>
      </div>
    </main>
  );
}

async function Courses() {
  await requireModerator();
  const courses = await listCoursesWithOfferings();

  if (!courses) {
    return (
      <p role="alert" className={notice}>
        Courses could not be loaded. Reload the page to try again.
      </p>
    );
  }

  const proposed = courses.flatMap((course) =>
    course.offerings
      .filter((o) => o.status === "pending")
      .map((offering) => ({ course, offering })),
  );

  return (
    <>
      <section>
        <h2 className="type-heading">Proposed by contributors ({proposed.length})</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Someone’s professor or term was not listed. Their review stays hidden until you approve.
        </p>
        {proposed.length === 0 ? (
          <p className={`${notice} mt-3`}>Nothing waiting.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {proposed.map(({ course, offering }) => (
              <li key={offering.id} className={card}>
                <p className="font-semibold text-foreground">{course.title}</p>
                <p className="text-sm text-foreground">{offeringLabel(offering)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionButton
                    action={approveOffering.bind(null, offering.id)}
                    className={smallButton}
                  >
                    Approve
                  </ActionButton>
                  <ActionButton
                    action={deleteOffering.bind(null, offering.id)}
                    className={`${dangerButton} px-3 text-sm`}
                    confirmText="Delete this proposed offering?"
                  >
                    Delete
                  </ActionButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="type-heading">All courses ({courses.length})</h2>
        {courses.length === 0 ? (
          <p className={`${notice} mt-3`}>No courses yet. Import a file above to add them.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {courses.map((course) => {
              const approved = course.offerings.filter((o) => o.status === "approved");
              return (
                <li key={course.id} className={card}>
                  <p className="font-semibold text-foreground">{course.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {course.code}
                    {course.area ? ` · ${course.area}` : ""}
                    {course.open_to_readers ? "" : " · hidden from readers"}
                  </p>

                  {approved.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">No offerings yet.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {approved.map((offering) => (
                        <li
                          key={offering.id}
                          className="flex flex-wrap items-center justify-between gap-2 text-sm"
                        >
                          <span>
                            {offeringLabel(offering)}
                            {offering.is_current ? (
                              <span className="type-tag ml-2">Current</span>
                            ) : null}
                          </span>
                          {offering.is_current ? null : (
                            <ActionButton
                              action={makeCurrent.bind(null, offering.id)}
                              className={smallButton}
                            >
                              Make current
                            </ActionButton>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className="mt-3 text-sm break-all text-muted-foreground">
                    Contributor link: {siteUrl()}/contribute?src=CAMPAIGN&amp;course={course.id}
                  </p>
                  <div className="mt-2">
                    <ActionButton
                      action={setOpenToReaders.bind(null, course.id, !course.open_to_readers)}
                      className={smallButton}
                    >
                      {course.open_to_readers ? "Hide from readers" : "Show to readers"}
                    </ActionButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
