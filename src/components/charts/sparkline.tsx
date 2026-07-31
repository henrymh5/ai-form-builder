import { areaPath, linePath } from "./chart-scale";

const VIEWBOX_WIDTH = 100;
const VIEWBOX_HEIGHT = 24;

/**
 * Tiny inline trend line for a KPI cell — the value and delta beside it
 * already carry the meaning, so this is always `aria-hidden`. `viewBox` +
 * `preserveAspectRatio="none"` lets it stretch to the cell width;
 * `vectorEffect="non-scaling-stroke"` is mandatory on the line so the
 * stroke doesn't smear horizontally as the box widens.
 */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(0, ...values);

  // Flat mid-height line when there's nothing to show a trend for — never an empty box.
  if (max === 0 || values.length < 2) {
    return (
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
        className={className ?? "h-6 w-full"}
        aria-hidden="true"
      >
        <line
          x1={0}
          y1={VIEWBOX_HEIGHT / 2}
          x2={VIEWBOX_WIDTH}
          y2={VIEWBOX_HEIGHT / 2}
          className="stroke-border"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  const area = areaPath(values, max, VIEWBOX_WIDTH, VIEWBOX_HEIGHT);
  const line = linePath(values, max, VIEWBOX_WIDTH, VIEWBOX_HEIGHT);

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      preserveAspectRatio="none"
      className={className ?? "h-6 w-full"}
      aria-hidden="true"
    >
      <path d={area} className="fill-primary-subtle" stroke="none" />
      <path
        d={line}
        className="stroke-primary"
        fill="none"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
