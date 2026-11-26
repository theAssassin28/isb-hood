import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CompanyNoteForm, type CompanyNoteFields } from "@/components/career-form";
import { notice, pageColumn } from "@/components/styles";
import { requireWriter } from "@/lib/auth/session";
import { getMyCareerEntry } from "@/lib/db/myCareerEntry";
import { getSettings } from "@/lib/db/settings";
import { careerWritingOpenTo } from "@/lib/domain/settings";

export const metadata: Metadata = { title: "Write a company note · ISB Hood" };

// /write/company-note              a new company note
// /write/company-note?entry=<id>   edit one of your notes
export default function WriteCompanyNotePage({ searchParams }: PageProps<"/write/company-note">) {
  return (
    <main className={pageColumn}>
      <Suspense fallback={<p className="text-muted-foreground">Loading the form…</p>}>
        <Editor searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const strOrNull = (v: unknown) => (typeof v === "string" && v !== "" ? v : null);

async function Editor({
  searchParams,
}: {
  searchParams: PageProps<"/write/company-note">["searchParams"];
}) {
  const { profile } = await requireWriter();
  const [params, settings] = await Promise.all([searchParams, getSettings()]);
  if (!careerWritingOpenTo(profile, settings)) {
    return (
      <p className={notice}>Career entries open for writing soon. Course reviews are open now.</p>
    );
  }
  const existing = params.entry ? await getMyCareerEntry(profile.id, params.entry) : null;
  if (params.entry && (!existing || existing.type !== "company_note")) {
    return <p className={notice}>That company note could not be found, or it is not yours.</p>;
  }
  if (existing?.status === "removed") {
    return <p className={notice}>This note was removed by a moderator and cannot be edited.</p>;
  }

  const b = existing?.body ?? {};
  const initial: CompanyNoteFields = {
    visibility: existing?.visibility ?? "named",
    open_to_questions: existing?.open_to_questions ?? true,
    company: str(b.company),
    role: str(b.role),
    year: str(b.year),
    track: strOrNull(b.track) ?? profile.target_track,
    relationship: strOrNull(b.relationship),
    process_rounds: str(b.process_rounds),
    what_was_asked: str(b.what_was_asked),
    prep_that_worked: str(b.prep_that_worked),
    culture_and_team: str(b.culture_and_team),
    recommend: strOrNull(b.recommend),
    recommend_to_whom: str(b.recommend_to_whom),
  };

  return (
    <>
      <Link
        href="/write"
        className="inline-flex min-h-11 items-center text-sm text-brand underline underline-offset-4"
      >
        Write
      </Link>
      <CompanyNoteForm
        heading={{
          title: existing ? "Edit your company note" : "Write a company note",
          lead: "One company’s process, what they asked and what prep worked. About 5 minutes.",
        }}
        author={{ name: profile.full_name ?? "ISB student", cohort: profile.cohort ?? "ISB" }}
        entryId={existing?.id ?? null}
        initial={initial}
        wasPublished={!!existing && existing.status !== "draft"}
      />
    </>
  );
}
