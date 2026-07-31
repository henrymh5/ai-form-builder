import { cn } from "@/lib/cn";
import type { DailyBucket } from "@/lib/db/repositories/workspace-analytics";
import { niceMax, yTicks } from "./chart-scale";

const PLOT_HEIGHT_CLASS = "h-52";

function formatDayLabel(dateKey: string): string {
  const [, month, day] = dateKey.split("-");
  return `${day}.${month}.`;
}

/**
 * 30-day views/responses bar chart — deliberately HTML `div`s, not SVG.
 * Each day is naturally a discrete bar (not a smoothed line), the bar IS
 * the hover target, and keeping marks in HTML means the CSS tooltip
 * inherits the app's real font tokens instead of scaling with an SVG
 * viewBox. SVG is used only for the static gridlines, which have no text
 * and therefore nothing to mis-scale.
 *
 * The visual is `aria-hidden`; a `sr-only` table right below carries the
 * same 30 rows as real text — a bar chart can't be summarized in one
 * `aria-label`.
 */
export function ActivityChart({
  days,
  caption,
  className,
}: {
  days: DailyBucket[];
  caption: string;
  className?: string;
}) {
  const rawMax = Math.max(0, ...days.flatMap((d) => [d.views, d.responses]));
  const max = niceMax(rawMax);
  const ticks = yTicks(max, 4);
  const isEmpty = days.every((d) => d.views === 0 && d.responses === 0);
  const labelEvery = Math.max(1, Math.ceil(days.length / 6));

  return (
    <div className={className}>
      <div className="flex gap-2">
        <div className="flex w-8 shrink-0 flex-col-reverse justify-between py-1 text-right">
          {ticks.map((t) => (
            <span key={t} className="text-text-muted text-xs leading-none">
              {Math.round(t)}
            </span>
          ))}
        </div>

        <div className={cn("relative min-w-0 flex-1", PLOT_HEIGHT_CLASS)}>
          <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
            {ticks.map((t) => {
              const y = `${100 - (t / max) * 100}%`;
              return (
                <line
                  key={t}
                  x1="0"
                  y1={y}
                  x2="100%"
                  y2={y}
                  className="stroke-border"
                  strokeWidth={1}
                />
              );
            })}
          </svg>

          <div className="relative flex h-full items-end gap-px" aria-hidden="true">
            {days.map((day) => {
              const viewHeight = (day.views / max) * 100;
              const responseHeight = (day.responses / max) * 100;
              return (
                <div key={day.date} className="group relative h-full min-w-0 flex-1">
                  <div className="group-hover:bg-surface-subtle absolute inset-0 rounded-sm" />
                  <div
                    className={cn(
                      "absolute inset-x-1 bottom-0 rounded-t-sm bg-teal-200",
                      day.views > 0 && "min-h-px",
                    )}
                    style={{ height: `${viewHeight}%` }}
                  />
                  <div
                    className={cn(
                      "bg-primary absolute inset-x-2.5 bottom-0 rounded-t-sm",
                      day.responses > 0 && "min-h-px",
                    )}
                    style={{ height: `${responseHeight}%` }}
                  />

                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 hidden -translate-x-1/2 pb-1.5 group-hover:block">
                    <div className="bg-text-primary rounded-md px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-md">
                      <div className="font-medium">{formatDayLabel(day.date)}</div>
                      <div>{day.views} Aufrufe</div>
                      <div>{day.responses} Antworten</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {isEmpty ? (
            <p className="text-text-muted pointer-events-none absolute inset-0 flex items-center justify-center text-sm">
              Noch keine Aktivität
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-1 flex pl-10" aria-hidden="true">
        {days.map((day, i) => (
          <span key={day.date} className="text-text-muted flex-1 text-center text-[11px]">
            {i % labelEvery === 0 || i === days.length - 1 ? formatDayLabel(day.date) : ""}
          </span>
        ))}
      </div>

      <p className="text-text-muted mt-1.5 text-[11px] opacity-70">{caption}</p>

      {/*
       * `sr-only` goes on a wrapping `div`, not the `table` itself — clipping
       * a `<table>`/`<caption>` directly is an unreliable pattern across
       * browsers (table caption boxes get special layout-engine treatment
       * that can ignore `position: absolute` clipping). The caption text
       * itself is already visible above for sighted users; this table is
       * purely the full 30-row data alternative for screen readers.
       */}
      <div className="sr-only">
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th>Datum</th>
              <th>Aufrufe</th>
              <th>Antworten</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.date}>
                <td>{day.date}</td>
                <td>{day.views}</td>
                <td>{day.responses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
