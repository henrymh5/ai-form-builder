import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DeltaResult } from "@/lib/analytics/rates";

/** Trend indicator — always an arrow glyph plus sign, never color alone (Style-Guide §23.8). */
export function DeltaBadge({ delta, className }: { delta: DeltaResult; className?: string }) {
  const base = "inline-flex items-center gap-0.5 text-xs font-medium";

  if (delta.ratio === null) {
    return (
      <span className={cn(base, "text-text-muted", className)}>
        <ArrowUp className="size-3" />
        neu
      </span>
    );
  }

  if (delta.direction === "flat") {
    return (
      <span className={cn(base, "text-text-muted", className)}>
        <Minus className="size-3" />
        ±0%
      </span>
    );
  }

  const Icon = delta.direction === "up" ? ArrowUp : ArrowDown;
  const percent = Math.round(Math.abs(delta.ratio) * 100);

  return (
    <span className={cn(base, delta.direction === "up" ? "text-success" : "text-error", className)}>
      <Icon className="size-3" />
      {delta.direction === "up" ? "+" : "-"}
      {percent}%
    </span>
  );
}
