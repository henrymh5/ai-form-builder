import { Skeleton } from "@/components/ui/skeleton";

/** Instant loading state for the builder (plan §23.14 3-column layout) while the form draft streams in. */
export default function BuilderLoading() {
  return (
    <div className="-m-8 flex h-[calc(100vh-var(--layout-header-height))] flex-col">
      <div className="border-border bg-surface flex h-14 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-px" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="border-border bg-surface w-64 shrink-0 space-y-4 border-r p-4">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </aside>

        <div className="flex-1 space-y-4 p-8">
          <div className="mx-auto max-w-(--layout-content-max) space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border-border bg-surface space-y-3 rounded-lg border p-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        </div>

        <aside className="border-border bg-surface w-80 shrink-0 space-y-4 border-l p-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-20 w-full" />
        </aside>
      </div>
    </div>
  );
}
