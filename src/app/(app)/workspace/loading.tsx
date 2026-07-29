import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

/** Instant loading state for the workspace page while members stream in. */
export default function WorkspaceLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      <Card className="space-y-3">
        <Skeleton className="h-5 w-24" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </Card>
    </div>
  );
}
