import { demoSignIn } from "@/lib/demo/actions";
import { db, personas } from "@/lib/demo/db";
import { cardFrame } from "./styles";

/** The demo's sign-in: pick who to be. People and their notes come from lib/demo/seed-data.ts. */
export function DemoPersonas({
  door,
  side,
}: {
  door?: "reader" | "contributor";
  /** "other": the sample people who are not one of the primary personas. */
  side?: "seeker" | "contributor" | "other";
}) {
  const people = personas()
    .filter((p) => !door || p.door === door)
    .filter((p) => !side || (side === "other" ? !p.side : p.side === side));
  const live = db().profiles;
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {people.map((p) => {
        const deleted = !!live.find((x) => x.id === p.id)?.deleted_at;
        return (
          <li key={p.id} className={`${cardFrame} flex`}>
            <form action={demoSignIn.bind(null, p.id)} className="flex w-full">
              <button
                type="submit"
                disabled={deleted}
                className="flex w-full flex-col items-start rounded-lg p-5 text-left hover:bg-background disabled:opacity-45"
              >
                <span className="block font-medium text-foreground">{p.title}</span>
                <span className="mt-0.5 block text-sm break-all text-muted-foreground">
                  {p.email}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {deleted
                    ? "Deleted their account in this demo. Reset the demo to bring them back."
                    : p.shows}
                </span>
                {!deleted ? (
                  <span className="mt-auto inline-block pt-3 text-sm font-medium text-brand">
                    Continue as this person →
                  </span>
                ) : null}
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
