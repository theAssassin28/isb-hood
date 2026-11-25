// Loading placeholders shaped like the content they stand in for, so nothing
// moves when the data arrives (Doherty). Static on purpose: the visual system
// allows one movement only (a 1px press), and this also suits reduced motion.

const block = "rounded-md bg-card";
const cardShape = "rounded-lg border border-border bg-card";

function Status({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

const Line = ({ w, h = "h-4", className = "" }: { w: string; h?: string; className?: string }) => (
  <div className={`${block} ${h} ${w} ${className}`} />
);

/** Home: greeting, search, three cards. */
export function HomeSkeleton() {
  return (
    <Status label="Loading…">
      <Line w="w-56" h="h-9" />
      <Line w="w-full max-w-xl" className="mt-4" />
      <Line w="w-2/3 max-w-md" className="mt-2" />
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${cardShape} h-40`} />
        ))}
      </div>
    </Status>
  );
}

/** Course list: search, filters, a grid of course cards. */
export function CourseGridSkeleton() {
  return (
    <Status label="Loading courses…">
      <div className="flex max-w-2xl gap-2">
        <div className={`${block} h-11 flex-1 border border-border`} />
        <div className={`${block} h-11 w-24 rounded-full`} />
      </div>
      <div className={`${block} mt-3 h-11 border border-border`} />
      <Line w="w-24" className="mt-4" />
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`${cardShape} h-36`} />
        ))}
      </div>
    </Status>
  );
}

/** Course page: title, summary, then reviews, full width at every size. */
export function CoursePageSkeleton() {
  return (
    <Status label="Loading the course…">
      <div>
        <Line w="w-24" className="mt-3" />
        <Line w="w-72 max-w-full" h="h-9" className="mt-4" />
        <Line w="w-48" className="mt-3" />
        <div className={`${cardShape} mt-5 h-72`} />
        <Line w="w-32" h="h-6" className="mt-8" />
        <div className="mt-3 space-y-4">
          <div className={`${cardShape} h-64`} />
          <div className={`${cardShape} h-64`} />
        </div>
      </div>
    </Status>
  );
}

/** Forms, lists and admin queues: a few stacked cards. */
export function StackSkeleton({ label, rows = 3 }: { label: string; rows?: number }) {
  return (
    <Status label={label}>
      <div className="space-y-4">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className={`${cardShape} h-28`} />
        ))}
      </div>
    </Status>
  );
}
