import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { demoReset } from "@/lib/demo/actions";
import { personaOf } from "@/lib/demo/db";
import { isDemo } from "@/lib/demo/mode";

/**
 * A slim strip on every page in demo mode: that this is a prototype, who you
 * are signed in as (so a tester never loses track), switch persona, reset.
 * One line on a 375px phone.
 */
export function DemoBanner() {
  if (!isDemo()) return null;
  return (
    <div role="note" className="border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 px-4 text-sm lg:px-8">
        <span className="type-status text-warn">
          Prototype
          <Suspense fallback={null}>
            <WhoAmI />
          </Suspense>
        </span>
        <Link
          href="/sample-accounts"
          className="inline-flex min-h-11 items-center font-medium text-brand underline underline-offset-4"
        >
          Switch persona
        </Link>
        <form action={demoReset}>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Reset<span className="hidden lg:inline">&nbsp;demo data</span>
          </button>
        </form>
      </div>
    </div>
  );
}

/** "· Ananya" on phones, "· Ananya Kulkarni, Elective Optimiser" on desktop. */
async function WhoAmI() {
  const user = await getCurrentUser();
  if (!user) return null;
  const name = user.profile.full_name?.trim();
  if (!name) return null;
  const persona = personaOf(user.profile.id);
  return (
    <span className="font-medium text-foreground">
      · {name.split(/\s+/)[0]}
      <span className="hidden lg:inline">
        {name.includes(" ") ? ` ${name.split(/\s+/).slice(1).join(" ")}` : ""}
        {persona?.role ? `, ${persona.role}` : ""}
      </span>
    </span>
  );
}
