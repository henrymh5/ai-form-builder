import { Skeleton } from "@/components/ui/skeleton";

/** Instant loading state for the workflow editor while the definition streams in. */
export default function WorkflowEditorLoading() {
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
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="border-border bg-surface w-64 shrink-0 space-y-2 border-r p-3">
          <Skeleton className="h-4 w-16" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </aside>

        <div className="bg-surface-subtle flex-1" />

        <aside className="border-border bg-surface w-80 shrink-0 space-y-4 border-l p-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-full" />
        </aside>
      </div>
    </div>
  );
}
