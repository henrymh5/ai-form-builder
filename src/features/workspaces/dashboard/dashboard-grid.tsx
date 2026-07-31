import { completionRate, delta } from "@/lib/analytics/rates";
import type { WorkspaceOverview } from "@/lib/db/repositories/workspace-overview";
import { ActivityPanel } from "./activity-panel";
import { ConversionPanel } from "./conversion-panel";
import { formatCompactNumber, formatPercent } from "./format";
import { KpiStrip, type KpiItem } from "./kpi-strip";
import { RecentResponsesPanel } from "./recent-responses-panel";
import { TopFormsTable } from "./top-forms-table";
import { WorkflowPanel } from "./workflow-panel";

function buildKpiItems(overview: WorkspaceOverview): KpiItem[] {
  const { current, previous, days } = overview.timeSeries;
  const currentRate = completionRate(current.responses, current.starts) ?? 0;
  const previousRate = completionRate(previous.responses, previous.starts) ?? 0;

  return [
    {
      label: "Aufrufe (30 T.)",
      value: formatCompactNumber(current.views),
      delta: delta(current.views, previous.views),
      spark: days.map((d) => d.views),
    },
    {
      label: "Gestartet (30 T.)",
      value: formatCompactNumber(current.starts),
      delta: delta(current.starts, previous.starts),
      spark: days.map((d) => d.starts),
    },
    {
      label: "Antworten (30 T.)",
      value: formatCompactNumber(current.responses),
      delta: delta(current.responses, previous.responses),
      spark: days.map((d) => d.responses),
    },
    {
      label: "Completion Rate",
      value: formatPercent(completionRate(current.responses, current.starts)),
      delta: delta(currentRate, previousRate),
      spark: days.map((d) => completionRate(d.responses, d.starts) ?? 0),
    },
  ];
}

/** Dashboard landing: workspace statistics and quick entry points (plan §4), redesigned as a dense analytics layout. */
export function DashboardGrid({ overview }: { overview: WorkspaceOverview }) {
  return (
    <div className="space-y-6">
      <KpiStrip items={buildKpiItems(overview)} />

      <div className="grid gap-6 lg:grid-cols-3">
        <ActivityPanel series={overview.timeSeries} className="lg:col-span-2" />
        <ConversionPanel
          window={overview.timeSeries.current}
          statusBreakdown={overview.statusBreakdown}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <TopFormsTable forms={overview.topForms} className="lg:col-span-2" />
        <WorkflowPanel activity={overview.workflowActivity} />
      </div>

      <RecentResponsesPanel responses={overview.recentResponses} />
    </div>
  );
}
