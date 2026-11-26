import { careerLabel } from "@/lib/constants/vocab";

// Career paths as pills, one path per pill, side by side (wrapping on narrow
// screens). Used on course cards, in "What reviewers say" and in each review,
// so a path looks the same wherever it appears. Ink only: a pill is not a button.

export function CareerPills({
  tracks,
  label,
}: {
  /** Career values (paths, or older bare tracks), or { track, count } with how many named it. */
  tracks: (string | { track: string; count: number })[];
  /** Read out before the list, e.g. "Who should take it". */
  label: string;
}) {
  if (tracks.length === 0) return null;
  return (
    <ul aria-label={label} className="flex flex-wrap gap-1.5">
      {tracks.map((t) => {
        const track = typeof t === "string" ? t : t.track;
        const count = typeof t === "string" ? null : t.count;
        return (
          <li key={track} className="type-tag">
            {careerLabel(track)}
            {count !== null ? (
              <span className="ml-1.5 text-muted-foreground">
                {count}
                <span className="sr-only"> reviewer{count === 1 ? "" : "s"}</span>
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
