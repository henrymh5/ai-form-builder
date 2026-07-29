import { Card } from "@/components/ui/card";
import type { AnalyticsOverview } from "@/lib/db/repositories/analytics";

function formatDuration(ms: number | null): string {
  if (ms === null) return "–";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/** Overview metric cards (plan §13): views, starts, completions, rate, avg duration. */
export function OverviewCards({ overview }: { overview: AnalyticsOverview }) {
  const metrics = [
    { label: "Aufrufe", value: overview.views },
    { label: "Gestartet", value: overview.starts },
    { label: "Abgeschlossen", value: overview.completions },
    { label: "Completion Rate", value: formatPercent(overview.completionRate) },
    { label: "Ø Bearbeitungszeit", value: formatDuration(overview.avgDurationMs) },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {metrics.map((metric) => (
        <Card key={metric.label} className="text-center">
          <div className="text-text-primary text-2xl font-semibold">{metric.value}</div>
          <div className="text-text-muted mt-1 text-xs">{metric.label}</div>
        </Card>
      ))}
    </div>
  );
}
