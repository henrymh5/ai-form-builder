import { donutDashArray } from "./chart-scale";

export interface DonutSegment {
  label: string;
  value: number;
  /** Tailwind `stroke-*` token class, e.g. `"stroke-primary"`. */
  className: string;
}

const DEFAULT_SIZE = 128;
const DEFAULT_THICKNESS = 14;

/**
 * Status-breakdown ring built from stacked full `<circle>` strokes with
 * `strokeDasharray`/`strokeDashoffset` (see chart-scale's `donutDashArray`)
 * rather than arc `<path>`s — no large-arc-flag branch above 50%, no
 * degenerate path at exactly 100%. Deliberately no `stroke-linecap="round"`:
 * rounded caps overlap between adjacent segments and visually misreport
 * the proportions.
 */
export function Donut({
  segments,
  size = DEFAULT_SIZE,
  thickness = DEFAULT_THICKNESS,
  ariaLabel,
  className,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  ariaLabel: string;
  className?: string;
}) {
  const radius = (size - thickness) / 2;
  const center = size / 2;
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const arcs = donutDashArray(
    segments.map((s) => s.value),
    radius,
  );

  return (
    <div className={className ?? "relative inline-block"} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={ariaLabel}
      >
        <g transform={`rotate(-90 ${center} ${center})`}>
          {arcs.length === 0 ? (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              strokeWidth={thickness}
              className="stroke-surface-subtle"
            />
          ) : (
            arcs.map((arc, i) => (
              <circle
                key={segments[i]!.label}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                strokeWidth={thickness}
                strokeDasharray={arc.dash}
                strokeDashoffset={arc.offset}
                className={segments[i]!.className}
              />
            ))
          )}
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="text-text-primary text-xl font-semibold">{total > 0 ? total : "–"}</span>
      </div>
    </div>
  );
}
