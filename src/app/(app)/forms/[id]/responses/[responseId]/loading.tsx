import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

/** Instant loading state for the response detail view (plan §8) while the response streams in. */
export default function ResponseDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Skeleton className="h-4 w-24" />

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      <Card className="space-y-4">
        <Skeleton className="h-5 w-24" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        ))}
      </Card>

      <Card className="space-y-3">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-8 w-32" />
      </Card>
    </div>
  );
}
