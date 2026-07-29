import { cn } from "@/lib/cn";
import type { Progress } from "@/lib/logic-engine/navigation";
import type { Settings } from "@/lib/form-schema/settings";

/**
 * Renders the progress indicator for the public form renderer (plan §7).
 * `progress` must come from `computeProgress` (lib/logic-engine/navigation)
 * so skipped pages never count — this component only renders the numbers
 * it's given, it does no path calculation itself.
 */
export function ProgressIndicator({
  mode,
  progress,
}: {
  mode: Settings["progressDisplay"];
  progress: Progress;
}) {
  if (mode === "none") return null;

  if (mode === "steps") {
    return (
      <p className="text-text-secondary text-sm" role="status">
        Schritt {progress.currentStepNumber} von {progress.totalSteps}
      </p>
    );
  }

  if (mode === "percent") {
    return (
      <p className="text-text-secondary text-sm" role="status">
        {progress.percent}%
      </p>
    );
  }

  return (
    <div
      role="progressbar"
      aria-valuenow={progress.percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className="bg-surface-subtle h-1.5 w-full overflow-hidden rounded-full"
    >
      <div
        className={cn("bg-primary h-full rounded-full transition-all")}
        style={{ width: `${progress.percent}%` }}
      />
    </div>
  );
}
