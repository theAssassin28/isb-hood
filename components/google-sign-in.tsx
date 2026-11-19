import { signInWithGoogle } from "@/lib/auth/actions";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { notice } from "./styles";
import { SubmitButton } from "./submit-button";

/** "Continue with Google" form. `intent` records which door the person used. */
export function GoogleSignIn({
  intent,
  src,
  course,
  next,
}: {
  intent: "reader" | "contributor";
  src?: string | null;
  course?: string | null;
  next?: string | null;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <p className={notice} role="status">
        Sign-in is not switched on yet. The team is still setting up.
      </p>
    );
  }
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="intent" value={intent} />
      {src ? <input type="hidden" name="src" value={src} /> : null}
      {course ? <input type="hidden" name="course" value={course} /> : null}
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <SubmitButton pendingLabel="Opening Google…">Continue with Google</SubmitButton>
    </form>
  );
}
