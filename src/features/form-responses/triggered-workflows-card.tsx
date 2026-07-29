import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { RunStatusBadge } from "@/features/workflow-builder/run-status-badge";
import type { RunForResponse } from "@/lib/db/repositories/workflow-runs";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "Ausgelöste Workflows" section on the response detail page — links into each workflow's run history. */
export function TriggeredWorkflowsCard({ runs }: { runs: RunForResponse[] }) {
  if (runs.length === 0) return null;

  return (
    <Card className="space-y-3">
      <CardTitle>Ausgelöste Workflows</CardTitle>
      <ul className="space-y-2">
        {runs.map((run) => (
          <li key={run.id} className="flex items-center justify-between gap-2 text-sm">
            <Link
              href={`/workflows/${run.workflowId}/runs`}
              className="text-text-primary hover:underline"
            >
              {run.workflowName}
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-text-muted text-xs">{formatDateTime(run.createdAt)}</span>
              <RunStatusBadge status={run.status} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
