import { Card, CardTitle } from "@/components/ui/card";
import type { FunnelStep } from "@/lib/db/repositories/analytics";

/** Per-page funnel (plan §13): session counts reaching each page, in document order. */
export function FunnelChart({ steps }: { steps: FunnelStep[] }) {
  const maxCount = Math.max(1, ...steps.map((s) => s.sessionCount));

  return (
    <Card className="space-y-4">
      <CardTitle>Funnel</CardTitle>
      {steps.length === 0 ? (
        <p className="text-text-secondary text-sm">Keine Daten vorhanden.</p>
      ) : (
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.pageId} className="space-y-1">
              <div className="text-text-secondary flex justify-between text-xs">
                <span>
                  Seite {index + 1}: {step.pageTitle}
                </span>
                <span>{step.sessionCount}</span>
              </div>
              <div className="bg-surface-subtle h-2 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${(step.sessionCount / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
