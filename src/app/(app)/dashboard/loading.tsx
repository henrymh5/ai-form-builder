import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Instant loading state — structural mirror of dashboard-grid.tsx so nothing shifts on hydration. */
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-36" />
      </div>

      <div className="space-y-6">
        <div className="border-border bg-border grid grid-cols-2 gap-px overflow-hidden rounded-lg border shadow-sm lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface p-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-10" />
              </div>
              <Skeleton className="mt-2 h-7 w-14" />
              <Skeleton className="mt-3 h-6 w-full" />
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
            {/* One skeleton block, not 30 fake bars — less DOM and less visual noise than the real chart. */}
            <Skeleton className="mt-4 h-52 w-full" />
          </Card>

          <Card className="space-y-5">
            <Skeleton className="h-5 w-32" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
            <div className="border-border flex items-center gap-4 border-t pt-4">
              <Skeleton className="size-24 rounded-full" />
              <div className="space-y-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-3 w-24" />
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="border-border overflow-hidden rounded-lg border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="border-border flex items-center gap-4 border-b px-4 py-3 last:border-0"
                >
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-10" />
                </div>
              ))}
            </div>
          </div>

          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="size-20 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </Card>
        </div>

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
