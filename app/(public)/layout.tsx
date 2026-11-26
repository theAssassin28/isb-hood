import { shellWidth } from "@/components/styles";
import { ThemeToggle } from "@/components/theme-switch";

// Public pages: the brand at the shell width, then the page. Sign-in, the
// contributor landing and sample accounts use the full width from 1024px;
// the other pages keep a centred reading column of their own.
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <main className={`${shellWidth} flex flex-1 flex-col pt-8 pb-12`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="type-label">ISB Hyderabad</p>
          <p className="mt-1 type-heading">ISB Hood</p>
        </div>
        <ThemeToggle />
      </div>
      <div className="mt-8 flex flex-1 flex-col lg:mt-12">{children}</div>
    </main>
  );
}
