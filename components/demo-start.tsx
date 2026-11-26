import Link from "next/link";
import { demoSignIn } from "@/lib/demo/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { personaOf, personas } from "@/lib/demo/db";
import { isDemo } from "@/lib/demo/mode";
import { DemoScriptDock } from "./demo-script-dock";

// Prototype only. Built for someone handed the prototype with no context:
// the four primary personas are the obvious way in, each with a script that
// opens from a floating "Demo script" button on every app page.

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** A round badge with a person's initials. Ink only, no new colours. */
function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-foreground font-display text-base text-foreground"
    >
      {initials(name)}
    </span>
  );
}

const SIDES = [
  { side: "seeker", heading: "Looking for advice", note: "Juniors deciding what to bid for" },
  {
    side: "contributor",
    heading: "Sharing what they learned",
    note: "Seniors and classmates who write",
  },
] as const;

/** Sign-in page panel: "Testing the prototype? Start here", with one-tap personas. */
export function DemoStartPanel() {
  const people = personas().filter((p) => p.side);
  return (
    <section
      aria-labelledby="demo-start-heading"
      className="rounded-lg border-2 border-warn bg-card p-5 lg:p-6"
    >
      <p className="type-status text-warn">Prototype</p>
      <h2 id="demo-start-heading" className="mt-2 type-heading">
        Testing the prototype? Start here
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a person. You are signed in as them at once, and a short script of what to try opens
        (later, from the “Demo script” button at the bottom right). Switch person any time from the
        strip at the top.
      </p>

      <div className="mt-5 space-y-5">
        {SIDES.map(({ side, heading, note }) => (
          <div key={side}>
            <h3 className="font-medium text-foreground">{heading}</h3>
            <p className="text-sm text-muted-foreground">{note}</p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {people
                .filter((p) => p.side === side)
                .map((p) => {
                  const name = p.title.split(" · ")[0];
                  return (
                    <li key={p.id}>
                      <form action={demoSignIn.bind(null, p.id)}>
                        <button
                          type="submit"
                          className="flex w-full items-start gap-3 rounded-md border border-border bg-background p-3 text-left hover:border-input active:translate-y-px"
                        >
                          <Avatar name={name} />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium text-foreground">{name}</span>
                            <span className="block text-sm text-muted-foreground">{p.role}</span>
                            <span className="mt-1 block text-sm font-medium text-brand">
                              Continue as {name.split(" ")[0]} →
                            </span>
                          </span>
                        </button>
                      </form>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        More states (moderator, PGP YL, first visit, waiting for verification) are on{" "}
        <Link
          href="/sample-accounts"
          className="font-medium text-brand underline underline-offset-4"
        >
          Sample accounts
        </Link>
        .
      </p>
    </section>
  );
}

/**
 * The "Demo script" button and panel, for the signed-in persona
 * (prototype only, personas with a script only). Rendered by the app layout.
 */
export async function DemoScriptDockForUser() {
  if (!isDemo()) return null;
  const user = await getCurrentUser();
  const persona = user ? personaOf(user.profile.id) : null;
  if (!user || !persona?.script) return null;
  return (
    <DemoScriptDock
      script={{
        personaId: user.profile.id,
        name: persona.name ?? persona.title.split(" · ")[0],
        role: persona.role,
        shows: persona.shows,
        steps: persona.script.map((s) => ({ ...s })),
      }}
    />
  );
}
