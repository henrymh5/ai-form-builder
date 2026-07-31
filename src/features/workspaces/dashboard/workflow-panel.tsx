import Link from "next/link";
import { Donut } from "@/components/charts/donut";
import { Card, CardTitle } from "@/components/ui/card";
import { RunStatusBadge } from "@/features/workflow-builder/run-status-badge";
import { cn } from "@/lib/cn";
import type { WorkflowActivity } from "@/lib/db/repositories/workspace-analytics";

const TRIGGER_LABEL: Record<string, string> = {
  response_submitted: "Formularantwort",
  schedule: "Zeitplan",
  scheduled_once: "Einmalig",
  webhook_inbound: "Webhook",
  manual: "Manuell",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WorkflowPanel({
  activity,
  className,
}: {
  activity: WorkflowActivity;
  className?: string;
}) {
  if (activity.workflowCount === 0) {
    return (
      <Card className={cn("flex flex-col items-center gap-2 py-10 text-center", className)}>
        <p className="text-text-primary text-sm font-medium">Noch keine Workflows</p>
        <p className="text-text-secondary max-w-sm text-sm">
          Automatisiere Benachrichtigungen und Antwort-Aktionen mit Workflows.
        </p>
        <Link
          href="/workflows"
          className="text-primary-text hover:text-primary-hover mt-1 text-sm font-medium"
        >
          Zu den Workflows
        </Link>
      </Card>
    );
  }

  return (
    <Card className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <CardTitle>Workflow-Aktivität</CardTitle>
        <Link href="/workflows" className="text-primary-text hover:text-primary-hover text-sm">
          Alle Workflows
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <Donut
          segments={[
            { label: "Erfolgreich", value: activity.counts.succeeded, className: "stroke-success" },
            { label: "Fehlgeschlagen", value: activity.counts.failed, className: "stroke-error" },
          ]}
          ariaLabel="Erfolgsquote der Workflow-Läufe"
          size={80}
          thickness={10}
        />
        <div className="text-xs">
          <div className="text-text-primary text-lg font-semibold">
            {activity.successRate === null ? "–" : `${Math.round(activity.successRate * 100)}%`}
          </div>
          <div className="text-text-muted">Erfolgsquote (30 T.)</div>
        </div>
      </div>

      {activity.recentRuns.length === 0 ? (
        <p className="text-text-muted text-xs">Noch keine Läufe in den letzten 30 Tagen.</p>
      ) : (
        <ul className="divide-border -mx-1 divide-y">
          {activity.recentRuns.map((run) => (
            <li key={run.id} className="flex items-center justify-between gap-2 px-1 py-2 text-xs">
              <div className="min-w-0">
                <div className="text-text-primary truncate font-medium">{run.workflowName}</div>
                <div className="text-text-muted">
                  {TRIGGER_LABEL[run.triggerType] ?? run.triggerType} · {formatDate(run.createdAt)}
                </div>
              </div>
              <RunStatusBadge status={run.status} className="shrink-0" />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
