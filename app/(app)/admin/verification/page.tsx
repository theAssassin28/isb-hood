import type { Metadata } from "next";
import { Suspense } from "react";
import { StackSkeleton } from "@/components/skeleton";
import { card, notice, pageColumn } from "@/components/styles";
import { requireModerator } from "@/lib/auth/session";
import { suggestMatches, type OutreachContact } from "@/lib/domain/outreachMatch";
import { createClient } from "@/lib/supabase/server";
import { DecisionForm, type MatchOption } from "./decision-form";

export const metadata: Metadata = { title: "Verify contributors · ISB Hood" };

type Pending = {
  id: string;
  email: string;
  full_name: string | null;
  cohort: string | null;
  programme: string | null;
  source: string | null;
  profile_completed_at: string;
};

export default function VerificationPage() {
  return (
    <main className={pageColumn}>
      <h1 className="type-title">Verify contributors</h1>
      <p className="mt-2 text-foreground/80">
        People who signed in from an outreach link without an ISB email. Verifying publishes
        everything they have written and lets them read.
      </p>
      <div className="mt-6">
        <Suspense fallback={<StackSkeleton label="Loading the queue…" />}>
          <Queue />
        </Suspense>
      </div>
    </main>
  );
}

async function Queue() {
  await requireModerator();
  const supabase = await createClient();

  const [pendingResult, contactsResult, reviewsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, cohort, programme, source, profile_completed_at")
      .eq("account_type", "contributor")
      .eq("verification_status", "pending")
      .not("profile_completed_at", "is", null)
      .is("deleted_at", null)
      .order("profile_completed_at", { ascending: true })
      .returns<Pending[]>(),
    supabase
      .from("outreach_contacts")
      .select("id, full_name, cohort, email, claimed_by")
      .returns<OutreachContact[]>(),
    supabase
      .from("course_reviews")
      .select("author_id")
      .eq("status", "pending_verification")
      .returns<{ author_id: string }[]>(),
  ]);

  if (pendingResult.error || contactsResult.error || reviewsResult.error) {
    return (
      <p role="alert" className={notice}>
        The queue could not be loaded. Reload the page; if it keeps failing, check the database.
      </p>
    );
  }

  const pending = pendingResult.data;
  const contacts = contactsResult.data;
  const waiting = new Map<string, number>();
  for (const row of reviewsResult.data) {
    waiting.set(row.author_id, (waiting.get(row.author_id) ?? 0) + 1);
  }

  if (pending.length === 0) {
    return <p className={notice}>Nobody is waiting. New contributors appear here oldest first.</p>;
  }

  return (
    <>
      {contacts.length === 0 ? (
        <p className={`${notice} mb-4`}>
          The outreach list is empty, so no matches can be suggested yet.
        </p>
      ) : null}
      <ul className="space-y-4">
        {pending.map((person) => {
          const matches: MatchOption[] = suggestMatches(
            { ...person, full_name: person.full_name },
            contacts,
          ).map(({ contact, reason }) => ({
            id: contact.id,
            label: `${contact.full_name}${contact.cohort ? `, ${contact.cohort}` : ""} (${
              reason === "email" ? "same email" : "similar name"
            })`,
          }));
          const entries = waiting.get(person.id) ?? 0;
          const name = person.full_name ?? "No name given";

          return (
            <li key={person.id} className={card}>
              <h2 className="font-semibold text-foreground">{name}</h2>
              <dl className="mt-2 space-y-1 text-sm">
                <Row label="Signed in with" value={person.email} />
                <Row label="Says they are" value={person.cohort ?? "No cohort given"} />
                <Row label="Came from" value={person.source ?? "Unknown"} />
                <Row label="Waiting since" value={formatDate(person.profile_completed_at)} />
                <Row label="Entries waiting" value={entries === 0 ? "None yet" : String(entries)} />
              </dl>
              <DecisionForm targetId={person.id} personName={name} matches={matches} />
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-muted-foreground">{label}:</dt>
      <dd className="min-w-0 break-words text-foreground">{value}</dd>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}
