import { Badge } from "@/components/ui/badge";
import type { WorkflowStatus } from "@/lib/db/repositories/workflows";

const LABEL: Record<WorkflowStatus, string> = {
  enabled: "Aktiv",
  paused: "Pausiert",
};

export function WorkflowStatusBadge({
  status,
  className,
}: {
  status: WorkflowStatus;
  className?: string;
}) {
  return (
    <Badge variant={status === "enabled" ? "success" : "neutral"} className={className}>
      {LABEL[status]}
    </Badge>
  );
}
