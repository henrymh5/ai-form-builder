import { ActivityChart } from "@/components/charts/activity-chart";
import { Card, CardTitle } from "@/components/ui/card";
import type { WorkspaceTimeSeries } from "@/lib/db/repositories/workspace-analytics";

export function ActivityPanel({
  series,
  className,
}: {
  series: WorkspaceTimeSeries;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex items-center justify-between">
        <CardTitle>Aktivität (30 Tage)</CardTitle>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-text-secondary flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-teal-200" />
            Aufrufe
          </span>
          <span className="text-text-secondary flex items-center gap-1.5">
            <span className="bg-primary size-2.5 rounded-sm" />
            Antworten
          </span>
        </div>
      </div>
      <ActivityChart
        days={series.days}
        caption="Tägliche Aufrufe und Antworten der letzten 30 Tage"
        className="mt-4"
      />
    </Card>
  );
}
