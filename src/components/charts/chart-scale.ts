/**
 * Pure SVG/scale math shared by the hand-rolled chart components in this
 * folder — no JSX, no DOM, fully unit-testable. Every function here guards
 * its denominator (`max <= 0`, `values.length < 2`, an all-zero segment
 * list) and returns a finite result: a `NaN` that leaks into an SVG `d=` or
 * `height=` attribute fails silently — nothing renders, no error is thrown.
 */

/** Smallest "nice" (1/2/5 × 10^k) value ≥ `rawMax` — a stable, uncluttered axis ceiling. Guards ≤ 0. */
export function niceMax(rawMax: number): number {
  if (rawMax <= 0) return 1;
  const exponent = Math.floor(Math.log10(rawMax));
  const fraction = rawMax / 10 ** exponent;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * 10 ** exponent;
}

/** `count + 1` evenly spaced tick values from 0 to `max`, inclusive. */
export function yTicks(max: number, count = 4): number[] {
  if (max <= 0 || count <= 0) return [0];
  const step = max / count;
  return Array.from({ length: count + 1 }, (_, i) => step * i);
}

function points(values: number[], max: number, w: number, h: number): string[] {
  const stepX = w / (values.length - 1);
  return values.map((v, i) => `${i * stepX},${h - (v / max) * h}`);
}

/** SVG `d=` for a line through `values`, normalized to `max` inside a `w`×`h` box. Empty string when fewer than 2 points or `max <= 0` (nothing to connect / would divide by zero). */
export function linePath(values: number[], max: number, w: number, h: number): string {
  if (values.length < 2 || max <= 0) return "";
  return `M${points(values, max, w, h).join("L")}`;
}

/** Same as {@link linePath}, closed down to the baseline for a filled area. */
export function areaPath(values: number[], max: number, w: number, h: number): string {
  if (values.length < 2 || max <= 0) return "";
  return `M${points(values, max, w, h).join("L")}L${w},${h}L0,${h}Z`;
}

/**
 * Per-segment `strokeDasharray`/`strokeDashoffset` for a donut built from
 * stacked full `<circle>` strokes (see donut.tsx) — avoids arc-path math
 * entirely (no `large-arc-flag` branch at >50%, no degenerate path at
 * 100%). Returns `[]` when every value is 0 (nothing to draw — the donut
 * component renders its own neutral empty-state ring instead).
 */
export function donutDashArray(
  values: number[],
  radius: number,
): { dash: string; offset: number }[] {
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) return [];

  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;
  return values.map((value) => {
    const length = (value / total) * circumference;
    const offset = -cumulative;
    cumulative += length;
    return { dash: `${length} ${circumference - length}`, offset };
  });
}
