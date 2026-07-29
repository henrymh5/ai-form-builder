import { Skeleton } from "@/components/ui/skeleton";

/** Instant loading state for the responses list (plan §8) while the list streams in. */
export default function ResponsesLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-36" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      <Skeleton className="h-9 w-48" />

      <div className="border-border overflow-hidden rounded-lg border">
        <div className="border-border bg-surface-subtle border-b px-4 py-2">
          <div className="flex gap-8">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border-border flex items-center gap-8 border-b px-4 py-3 last:border-0">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="ml-auto size-8 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
