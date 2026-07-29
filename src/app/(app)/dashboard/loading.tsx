import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

/** Instant loading state mirroring the dashboard's stat grid and recent lists. */
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-36" />
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="size-4 rounded" />
              </div>
              <Skeleton className="mt-2 h-8 w-12" />
            </Card>
          ))}
        </div>

        <Card className="flex flex-wrap gap-x-8 gap-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </Card>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <div className="mt-3 flex gap-4">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <Card className="divide-border divide-y p-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </Card>
        </section>
      </div>
    </div>
  );
}
