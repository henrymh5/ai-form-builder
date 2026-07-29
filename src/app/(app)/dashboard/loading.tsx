import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

/** Instant loading state for the dashboard (plan §23.13 layout) while the form list streams in. */
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-36" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-52" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="size-8 shrink-0 rounded-md" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="space-y-1 text-center">
                  <Skeleton className="mx-auto h-4 w-8" />
                  <Skeleton className="mx-auto h-3 w-10" />
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
