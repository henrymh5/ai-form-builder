import { cn } from "@/lib/cn";

/**
 * Extracted from the track+fill idiom duplicated in funnel-chart.tsx and
 * progress-indicator.tsx — modeled on the latter, since it's the version
 * that carries `role="progressbar"` + `aria-valuenow/min/max`.
 */
export function ProportionBar({
  value,
  max,
  ariaLabel,
  size = "md",
  className = "bg-primary",
}: {
  value: number;
  max: number;
  ariaLabel: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn(
        "bg-surface-subtle w-full overflow-hidden rounded-full",
        size === "sm" ? "h-1.5" : "h-2",
      )}
    >
      <div
        className={cn("h-full rounded-full transition-all", className)}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
