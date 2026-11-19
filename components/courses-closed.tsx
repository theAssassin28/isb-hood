import { notice } from "./styles";

/** Shown to PGP YL readers until their reading date (setting yl_read_open). */
export function CoursesClosedForYl() {
  return (
    <p role="status" className={notice}>
      Course reviews open to PGP YL students soon, once enough seniors have written them. You can
      already write about courses you have taken.
    </p>
  );
}
