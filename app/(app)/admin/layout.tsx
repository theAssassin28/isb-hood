import Link from "next/link";

const TABS = [
  { href: "/admin/moderation", label: "Flags" },
  { href: "/admin/verification", label: "Verify" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/outreach", label: "Outreach" },
  { href: "/admin/metrics", label: "Metrics" },
  { href: "/admin/settings", label: "Settings" },
] as const;

// Navigation only. Each admin page checks for a moderator itself
// (requireModerator), because layouts do not re-run on navigation.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <nav aria-label="Admin" className="border-b border-border bg-muted">
        <ul className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-2 lg:px-6">
          {TABS.map((tab) => (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className="inline-flex min-h-11 items-center px-3 text-sm font-medium text-brand hover:underline"
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {children}
    </>
  );
}
