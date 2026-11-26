import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy · ISB Hood" };

// docs/BUILD_PLAN.md 5.3 and 5.4.
export default function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-xl space-y-6 text-foreground">
      <h1 className="type-title">What we store</h1>

      <section>
        <h2 className="font-semibold text-foreground">What we keep</h2>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-foreground/80">
          <li>
            Your email address and name, and the profile you fill in once: programme, cohort,
            pre-MBA background, target track.
          </li>
          <li>What you write: reviews, questions and answers.</li>
          <li>
            Which pages you open and which buttons you press, to measure whether ISB Hood helps.
            This is for a student course project; it is never sold or shared.
          </li>
          <li>Your answers to the short surveys.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-semibold text-foreground">What we never collect</h2>
        <p className="mt-1 text-foreground/80">Grades, salaries, offer amounts or phone numbers.</p>
      </section>

      <section>
        <h2 className="font-semibold text-foreground">Who sees what</h2>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-foreground/80">
          <li>Reviews are read by signed-in ISB students and verified alumni only.</li>
          <li>
            If you keep your name hidden, readers see only “Verified Co’XX student”. The ISB Hood
            team (Group 12) can see who wrote it, to act on flags.
          </li>
          <li>
            Your email address is never shown to other users. Emails about questions come from ISB
            Hood, not from you.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="font-semibold text-foreground">Deleting</h2>
        <p className="mt-1 text-foreground/80">
          You can edit or delete anything you wrote, and delete your account from{" "}
          <Link href="/me" className="text-brand underline underline-offset-4">
            My activity
          </Link>
          . Deleting your account removes your reviews and profile; your comments are replaced with
          “deleted” so other people’s threads still make sense.
        </p>
      </section>
    </article>
  );
}
