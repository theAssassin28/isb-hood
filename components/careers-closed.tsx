import Link from "next/link";
import { notice } from "./styles";

/** Shown while careers_read_open is off (docs/BUILD_PLAN.md 7). */
export function CareersClosed() {
  return (
    <div className={notice}>
      <p>
        Career paths and company notes open to readers once alumni have written the first ones.
        Course reviews are open now.
      </p>
      <Link
        href="/courses"
        className="mt-2 inline-flex min-h-11 items-center font-medium text-brand underline underline-offset-4"
      >
        Go to courses
      </Link>
    </div>
  );
}
