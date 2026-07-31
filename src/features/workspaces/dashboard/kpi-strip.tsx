import { Sparkline } from "@/components/charts/sparkline";
import type { DeltaResult } from "@/lib/analytics/rates";
import { DeltaBadge } from "./delta-badge";

export interface KpiItem {
  label: string;
  value: string;
  delta: DeltaResult;
  spark: number[];
}

/**
 * One segmented panel instead of 4 floating `Card`s (Style-Guide §23.9
 * warns against unnecessary card grids). Hairlines come from a 1px gap
 * over a token background rather than `divide-x`/`divide-y` — Tailwind's
 * `divide-*` only borders every child but the first, which at
 * `grid-cols-2` puts a spurious border at the start of row 2.
 */
export function KpiStrip({ items }: { items: KpiItem[] }) {
  return (
    <div className="border-border bg-border grid grid-cols-2 gap-px overflow-hidden rounded-lg border shadow-sm lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-surface p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-text-muted text-xs">{item.label}</span>
            <DeltaBadge delta={item.delta} />
          </div>
          <div className="text-text-primary mt-2 text-2xl font-semibold">{item.value}</div>
          <Sparkline values={item.spark} className="mt-3 h-6 w-full" />
        </div>
      ))}
    </div>
  );
}
