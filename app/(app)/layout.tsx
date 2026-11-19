import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";

// Shell for signed-in screens. The header is static; anything that reads the
// session sits behind a Suspense boundary. Access is checked by each page,
// not here: layouts do not re-run on navigation.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex min-h-14 w-full max-w-xl items-center justify-between px-4">
          <Link href="/" className="type-heading inline-flex min-h-11 items-center">
            ISB Hood
          </Link>
          <Suspense fallback={null}>
            <AccountMenu />
          </Suspense>
        </div>
      </header>
      {children}
    </>
  );
}

async function AccountMenu() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <nav className="flex items-center gap-1 text-sm">
      <Link href="/me" className="inline-flex min-h-11 items-center px-2 font-medium text-brand">
        My activity
      </Link>
      {user.profile.role === "moderator" ? (
        <Link
          href="/admin/moderation"
          className="inline-flex min-h-11 items-center px-2 font-medium text-brand"
        >
          Admin
        </Link>
      ) : null}
      <form action={signOut}>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center px-2 text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
      </form>
    </nav>
  );
}
