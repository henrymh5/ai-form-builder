import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

/** Instant loading state for analytics (plan §13) while the on-demand queries run. */
export default function AnalyticsLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-28" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="items-center space-y-2 text-center">
            <Skeleton className="mx-auto h-7 w-12" />
            <Skeleton className="mx-auto h-3 w-16" />
          </Card>
        ))}
      </div>

      <Card className="space-y-4">
        <Skeleton className="h-5 w-16" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-6" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </Card>

      <Card className="space-y-4">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </Card>
    </div>
  );
}
