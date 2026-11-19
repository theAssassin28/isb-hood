import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Content rules · ISB Hood" };

// Requirements section 8 and the trust guardrails (deck slide 22).
// [confirm] wording with AAC/ASA before launch.
export default function RulesPage() {
  return (
    <article className="space-y-6 text-foreground">
      <h1 className="type-title">Content rules</h1>
      <p className="text-foreground/80">
        ISB Hood exists so the next batch can make better decisions. These rules keep it useful and
        fair to everyone it mentions.
      </p>

      <section>
        <h2 className="font-semibold text-foreground">Review the course, not the person</h2>
        <p className="mt-1 text-foreground/80">
          Write about workload, grading, teaching style and what you learned. No personal remarks
          about faculty, staff or students, positive or negative.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-foreground">Say why</h2>
        <p className="mt-1 text-foreground/80">
          Every rating needs a reason. A reason helps the next student decide whether your
          experience applies to them.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-foreground">No grades, pay or offer amounts</h2>
        <p className="mt-1 text-foreground/80">
          Do not post your grades, salaries, stipends or offer figures, or anyone else’s.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-foreground">Be honest, and current</h2>
        <p className="mt-1 text-foreground/80">
          Write about the professor and term you actually took. You can edit or delete what you
          wrote at any time.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-foreground">Flags and moderation</h2>
        <p className="mt-1 text-foreground/80">
          Anyone can flag a review or comment. A moderator from the ISB Hood team looks at every
          flag within 24 hours. Flagged content stays visible unless it breaks these rules; if it
          does, the moderator removes it or asks the author to edit it.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-foreground">Showing your name</h2>
        <p className="mt-1 text-foreground/80">
          You can show your name or appear as “Verified Co’XX student”. Moderators can always see
          who wrote an entry, so they can act on flags. Questions and answers in comments show your
          name and cohort.
        </p>
      </section>

      <p className="text-sm text-muted-foreground">
        See also{" "}
        <Link href="/privacy" className="text-brand underline underline-offset-4">
          what we store
        </Link>
        .
      </p>
    </article>
  );
}
