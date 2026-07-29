import { Badge } from "@/components/ui/badge";
import type { WorkflowRunStatus } from "@/lib/db/repositories/workflow-runs";

const LABEL: Record<WorkflowRunStatus, string> = {
  queued: "Wartet",
  running: "Läuft",
  succeeded: "Erfolgreich",
  failed: "Fehlgeschlagen",
};

const VARIANT: Record<WorkflowRunStatus, "neutral" | "info" | "success" | "error"> = {
  queued: "neutral",
  running: "info",
  succeeded: "success",
  failed: "error",
};

export function RunStatusBadge({ status, className }: { status: WorkflowRunStatus; className?: string }) {
  return (
    <Badge variant={VARIANT[status]} className={className}>
      {LABEL[status]}
    </Badge>
  );
}
