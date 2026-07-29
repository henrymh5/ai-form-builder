import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { FormStatus } from "@/lib/db/repositories/forms";

const STATUS_LABEL: Record<FormStatus, string> = {
  draft: "Entwurf",
  published: "Veröffentlicht",
  paused: "Pausiert",
  archived: "Archiviert",
};

const STATUS_VARIANT: Record<FormStatus, BadgeProps["variant"]> = {
  draft: "neutral",
  published: "success",
  paused: "warning",
  archived: "neutral",
};

/** Single source of truth for how a form's status looks (plan §23.8). */
export function FormStatusBadge({ status, className }: { status: FormStatus; className?: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className={className}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
