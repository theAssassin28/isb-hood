import { pageColumn } from "@/components/styles";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <main className={pageColumn}>
      <p className="type-label">ISB Hyderabad</p>
      <p className="mt-1 type-heading">ISB Hood</p>
      <div className="mt-8 flex flex-1 flex-col">{children}</div>
    </main>
  );
}
