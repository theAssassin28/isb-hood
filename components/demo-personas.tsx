import { demoSignIn } from "@/lib/demo/actions";
import { db, personas } from "@/lib/demo/db";
import { cardFrame } from "./styles";

/** The demo's sign-in: pick who to be. People and their notes come from lib/demo/seed-data.ts. */
export function DemoPersonas({ door }: { door?: "reader" | "contributor" }) {
  const people = personas().filter((p) => !door || p.door === door);
  const live = db().profiles;
  return (
    <ul className="space-y-3">
      {people.map((p) => {
        const deleted = !!live.find((x) => x.id === p.id)?.deleted_at;
        return (
          <li key={p.id} className={cardFrame}>
            <form action={demoSignIn.bind(null, p.id)}>
              <button
                type="submit"
                disabled={deleted}
                className="block w-full rounded-lg p-5 text-left hover:bg-background disabled:opacity-45"
              >
                <span className="block font-medium text-foreground">{p.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {deleted
                    ? "Deleted their account in this demo. Reset the demo to bring them back."
                    : p.shows}
                </span>
                {!deleted ? (
                  <span className="mt-3 inline-block text-sm font-medium text-brand">
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
