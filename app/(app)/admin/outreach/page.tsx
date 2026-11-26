import type { Metadata } from "next";
import { Suspense } from "react";
import { StackSkeleton } from "@/components/skeleton";
import { CsvImportForm } from "@/components/csv-import-form";
import { card, notice, pageColumn } from "@/components/styles";
import { requireModerator } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { importOutreach } from "./actions";

export const metadata: Metadata = { title: "Outreach list · ISB Hood admin" };

type Contact = {
  id: string;
  full_name: string;
  cohort: string | null;
  email: string | null;
  campaign: string | null;
  asked_course_ids: string[] | null;
  claimed_by: string | null;
};

export default function AdminOutreachPage() {
  return (
    <main className={pageColumn}>
      <h1 className="type-title">Outreach list</h1>
      <p className="mt-2 text-foreground/80">
        The seniors and alumni we are asking to contribute. It is what a new contributor’s name is
        checked against on the Verify tab.
      </p>

      <section className={`${card} mt-6`}>
        <h2 className="type-heading">Import</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One row per person and course asked. The same person on several rows becomes one contact.
          Do not include phone numbers.
        </p>
        <div className="mt-4">
          <CsvImportForm
            action={importOutreach}
            columns="name, cohort, email, course_code, campaign"
            example={
              "name,cohort,email,course_code,campaign\nKiran Shah,Co'26,,MKT-501,co26-term7\nMeera Das,Co'25,meera@example.com,FIN-502,co25-term7"
            }
          />
        </div>
      </section>

      <div className="mt-8">
        <Suspense fallback={<StackSkeleton label="Loading the list…" />}>
          <Contacts />
        </Suspense>
      </div>
    </main>
  );
}

async function Contacts() {
  await requireModerator();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outreach_contacts")
    .select("id, full_name, cohort, email, campaign, asked_course_ids, claimed_by")
    .order("full_name")
    .returns<Contact[]>();

  if (error) {
    return (
      <p role="alert" className={notice}>
        The list could not be loaded. Reload the page to try again.
      </p>
    );
  }
  if (data.length === 0) {
    return <p className={notice}>Nobody on the list yet. Import a file above to add people.</p>;
  }

  const signedUp = data.filter((c) => c.claimed_by).length;

  return (
    <section>
      <h2 className="type-heading">
        {data.length} people · {signedUp} verified as contributors
      </h2>
      <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
        {data.map((contact) => {
          const asked = contact.asked_course_ids?.length ?? 0;
          return (
            <li key={contact.id} className="p-3 text-sm">
              <p className="font-medium text-foreground">
                {contact.full_name}
                {contact.cohort ? `, ${contact.cohort}` : ""}
              </p>
              <p className="text-muted-foreground">
                {[
                  contact.email,
                  contact.campaign ? `campaign ${contact.campaign}` : null,
                  asked > 0 ? `asked about ${asked} course${asked === 1 ? "" : "s"}` : null,
                  contact.claimed_by ? "verified" : "not signed up yet",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
