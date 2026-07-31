/** Local to this dashboard folder — form-card.tsx, responses-table.tsx, and overview-cards.tsx each keep their own copies (a wider app-level dedupe is out of scope here). */

export function formatPercent(rate: number | null): string {
  return rate === null ? "–" : `${Math.round(rate * 100)}%`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Compact German grouping (1.284 instead of 1284) for KPI values. */
export function formatCompactNumber(value: number): string {
  return value.toLocaleString("de-DE");
}
