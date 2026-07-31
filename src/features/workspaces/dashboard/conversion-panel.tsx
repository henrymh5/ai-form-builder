import { Donut } from "@/components/charts/donut";
import { ProportionBar } from "@/components/charts/proportion-bar";
import { Card, CardTitle } from "@/components/ui/card";
import type { FormStatus } from "@/lib/db/repositories/forms";
import type { WindowTotals } from "@/lib/db/repositories/workspace-analytics";
import { cn } from "@/lib/cn";

const STATUS_ORDER: FormStatus[] = ["published", "draft", "paused", "archived"];

const STATUS_LABEL: Record<FormStatus, string> = {
  published: "Veröffentlicht",
  draft: "Entwurf",
  paused: "Pausiert",
  archived: "Archiviert",
};

const STATUS_STROKE: Record<FormStatus, string> = {
  published: "stroke-primary",
  draft: "stroke-teal-300",
  paused: "stroke-warning",
  archived: "stroke-border-strong",
};

const STATUS_DOT: Record<FormStatus, string> = {
  published: "bg-primary",
  draft: "bg-teal-300",
  paused: "bg-warning",
  archived: "bg-border-strong",
};

function FunnelRow({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="space-y-1">
      <div className="text-text-secondary flex justify-between text-xs">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <ProportionBar value={value} max={max} ariaLabel={label} />
    </div>
  );
}

/**
 * Funnel (30-day) + status donut in one panel. `window` names the 30-day
 * totals prop (not aliased to the global `window` identifier — destructured
 * locally as `activityWindow` to avoid the shadow). The lifetime form
 * counts live entirely in `statusBreakdown`/its legend now — a separate
 * `totals` prop would just duplicate `statusBreakdown`'s sum.
 */
export function ConversionPanel({
  window: activityWindow,
  statusBreakdown,
  className,
}: {
  window: WindowTotals;
  statusBreakdown: Record<FormStatus, number>;
  className?: string;
}) {
  const maxFunnel = Math.max(1, activityWindow.views);
  const segments = STATUS_ORDER.map((status) => ({
    label: STATUS_LABEL[status],
    value: statusBreakdown[status],
    className: STATUS_STROKE[status],
  }));

  return (
    <Card className={cn("space-y-5", className)}>
      <CardTitle>Trichter &amp; Status</CardTitle>

      <div className="space-y-3">
        <FunnelRow label="Aufrufe" value={activityWindow.views} max={maxFunnel} />
        <FunnelRow label="Gestartet" value={activityWindow.starts} max={maxFunnel} />
        <FunnelRow label="Antworten" value={activityWindow.responses} max={maxFunnel} />
      </div>

      <div className="border-border flex items-center gap-4 border-t pt-4">
        <Donut segments={segments} ariaLabel="Formulare nach Status" size={96} thickness={12} />
        <ul className="space-y-1.5 text-xs">
          {STATUS_ORDER.map((status) => (
            <li key={status} className="flex items-center gap-1.5">
              <span className={cn("size-2.5 rounded-sm", STATUS_DOT[status])} />
              <span className="text-text-secondary">{STATUS_LABEL[status]}</span>
              <span className="text-text-primary font-medium">{statusBreakdown[status]}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
