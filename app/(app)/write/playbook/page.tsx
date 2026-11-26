import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PlaybookForm, type PlaybookFields } from "@/components/career-form";
import { notice, pageColumn } from "@/components/styles";
import { requireWriter } from "@/lib/auth/session";
import { TRACKS } from "@/lib/constants/vocab";
import { listCoursesWithOfferings } from "@/lib/db/courses";
import { getMyCareerEntry } from "@/lib/db/myCareerEntry";
import { getSettings } from "@/lib/db/settings";
import { careerWritingOpenTo } from "@/lib/domain/settings";

export const metadata: Metadata = { title: "Write your playbook · ISB Hood" };

// /write/playbook               a new track playbook
// /write/playbook?track=<t>     the same, with the track chosen
// /write/playbook?entry=<id>    edit one of your playbooks
export default function WritePlaybookPage({ searchParams }: PageProps<"/write/playbook">) {
  return (
    <main className={pageColumn}>
      <Suspense fallback={<p className="text-muted-foreground">Loading the form…</p>}>
        <Editor searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const strOrNull = (v: unknown) => (typeof v === "string" && v !== "" ? v : null);
const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

async function Editor({
  searchParams,
}: {
  searchParams: PageProps<"/write/playbook">["searchParams"];
}) {
  const { profile } = await requireWriter();
  const [params, settings, courses] = await Promise.all([
    searchParams,
    getSettings(),
    listCoursesWithOfferings(),
  ]);
  if (!careerWritingOpenTo(profile, settings)) {
    return (
      <p className={notice}>Career entries open for writing soon. Course reviews are open now.</p>
    );
  }

  const existing = params.entry ? await getMyCareerEntry(profile.id, params.entry) : null;
  if (params.entry && (!existing || existing.type !== "playbook")) {
    return <p className={notice}>That playbook could not be found, or it is not yours.</p>;
  }
  if (existing?.status === "removed") {
    return <p className={notice}>This playbook was removed by a moderator and cannot be edited.</p>;
  }

  const b = obj(existing?.body);
  const from = obj(b.from);
  const to = obj(b.to);
  const path = obj(b.path);
  const numbers = obj(b.numbers);
  const mattered = obj(b.what_mattered);
  const trackParam = str(params.track);
  const initial: PlaybookFields = {
    visibility: existing?.visibility ?? "named",
    open_to_questions: existing?.open_to_questions ?? true,
    from_function: strOrNull(from.function) ?? profile.background_function,
    from_industry: strOrNull(from.industry) ?? profile.background_industry,
    from_years: strOrNull(from.years_band) ?? profile.years_experience_band,
    track:
      strOrNull(to.track) ??
      (TRACKS.some((t) => t.value === trackParam) ? trackParam : profile.target_track),
    role: str(to.role),
    company_type: strOrNull(to.company_type),
    company: str(to.company),
    path: {
      before_isb: str(path.before_isb),
      early_terms: str(path.early_terms),
      mid_terms: str(path.mid_terms),
      late_terms: str(path.late_terms),
      placement_weeks: str(path.placement_weeks),
    },
    applied: strOrNull(numbers.applied),
    shortlists: strOrNull(numbers.shortlists),
    interviews: strOrNull(numbers.interviews),
    offers: strOrNull(numbers.offers),
    mattered: Array.isArray(mattered.picks) ? mattered.picks.map(String) : [],
    mattered_why: str(mattered.why),
    course_ids: existing?.course_ids ?? [],
    latest_safe_start: str(b.latest_safe_start),
    mistakes_to_avoid: str(b.mistakes_to_avoid),
  };

  return (
    <>
      <Link
        href="/write"
        className="inline-flex min-h-11 items-center text-sm text-brand underline underline-offset-4"
      >
        Write
      </Link>
      <PlaybookForm
        heading={{
          title: existing ? "Edit your playbook" : "Write your playbook",
          lead: "How you got into your track, term by term. About 10 minutes. Readers with your background find it first.",
        }}
        author={{ name: profile.full_name ?? "ISB student", cohort: profile.cohort ?? "ISB" }}
        entryId={existing?.id ?? null}
        initial={initial}
        courses={(courses ?? []).map((c) => ({ id: c.id, code: c.code, title: c.title }))}
        wasPublished={!!existing && existing.status !== "draft"}
      />
    </>
  );
}
