/**
 * Shared ratio/delta math — the single source of truth for "completion
 * rate" and trend deltas across the app. Before this file existed, three
 * call sites (workspace-overview.ts, analytics.ts, form-card.tsx) each
 * computed a "completion rate" with a different denominator (views vs.
 * starts), silently disagreeing under the same label. Route every such
 * calculation through here instead of re-deriving it locally.
 */

/** `null` when `denominator` is 0 — never divide-by-zero into `NaN`/`Infinity`. */
export function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

/** Completions ÷ starts (not views — starts are the denominator every other call site already agreed on). */
export function completionRate(completions: number, starts: number): number | null {
  return ratio(completions, starts);
}

export interface DeltaResult {
  direction: "up" | "down" | "flat";
  /** Relative change vs. the previous period, or `null` when the previous period was 0 (can't express "new" as a percentage). */
  ratio: number | null;
}

/** Trend of `current` vs. `previous` (e.g. this 30-day window vs. the one before it). */
export function delta(current: number, previous: number): DeltaResult {
  if (previous === 0) {
    return current === 0 ? { direction: "flat", ratio: 0 } : { direction: "up", ratio: null };
  }
  const change = (current - previous) / previous;
  if (change === 0) return { direction: "flat", ratio: 0 };
  return { direction: change > 0 ? "up" : "down", ratio: change };
}
