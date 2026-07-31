import type { TriggerConfig } from "@/lib/workflow-schema/nodes";

/**
 * Pure next-occurrence math for schedule-based triggers — all UTC, no
 * timezone library (v1 decision: times are entered and displayed as UTC; an
 * IANA `timezone` field is the documented v2 extension point).
 *
 * Used by the cron route (compute the slot after firing), by
 * saveWorkflowDefinition/enable (persist workflows.next_run_at), and by
 * validation-adjacent UI hints. `scheduled_once` returns its runAt exactly
 * once (while still in the future), then null; the cron route pauses the
 * workflow after that single fire.
 *
 * Catch-up semantics: callers always pass `from = now`, so ticks missed
 * while the app was down collapse into ONE catch-up fire — the digest
 * window covers the whole gap, so firing N times would only produce N-1
 * empty digests.
 */

function parseTime(time: string): { hours: number; minutes: number } {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return { hours, minutes };
}

/** ISO weekday for a UTC date: 1 = Montag … 7 = Sonntag. */
function isoWeekdayUtc(date: Date): number {
  const day = date.getUTCDay(); // 0 = Sunday
  return day === 0 ? 7 : day;
}

function daysInMonthUtc(year: number, monthZeroBased: number): number {
  return new Date(Date.UTC(year, monthZeroBased + 1, 0)).getUTCDate();
}

function atTimeUtc(year: number, monthZeroBased: number, day: number, time: string): Date {
  const { hours, minutes } = parseTime(time);
  return new Date(Date.UTC(year, monthZeroBased, day, hours, minutes, 0, 0));
}

function nextDaily(time: string, from: Date): Date {
  const candidate = atTimeUtc(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), time);
  if (candidate > from) return candidate;
  const next = new Date(candidate);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function nextWeekly(time: string, weekday: number, from: Date): Date {
  const todayCandidate = atTimeUtc(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate(),
    time,
  );
  const currentWeekday = isoWeekdayUtc(from);
  let daysAhead = (weekday - currentWeekday + 7) % 7;
  if (daysAhead === 0 && todayCandidate <= from) daysAhead = 7;
  const next = new Date(todayCandidate);
  next.setUTCDate(next.getUTCDate() + daysAhead);
  return next;
}

function nextMonthly(time: string, dayOfMonth: number, from: Date): Date {
  // "31" means "Monatsende": clamp to the month's actual length.
  const clamp = (year: number, month: number) => Math.min(dayOfMonth, daysInMonthUtc(year, month));

  const thisMonthCandidate = atTimeUtc(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    clamp(from.getUTCFullYear(), from.getUTCMonth()),
    time,
  );
  if (thisMonthCandidate > from) return thisMonthCandidate;

  const nextMonth = from.getUTCMonth() === 11 ? 0 : from.getUTCMonth() + 1;
  const nextYear = from.getUTCMonth() === 11 ? from.getUTCFullYear() + 1 : from.getUTCFullYear();
  return atTimeUtc(nextYear, nextMonth, clamp(nextYear, nextMonth), time);
}

/**
 * Next UTC instant this trigger should fire strictly after `from`, or null
 * for trigger types that are not time-based (or a one-shot whose time has
 * passed).
 */
export function computeNextRunAt(config: TriggerConfig | null, from: Date): Date | null {
  if (!config) return null;

  switch (config.event) {
    case "schedule":
      switch (config.frequency) {
        case "daily":
          return nextDaily(config.time, from);
        case "weekly":
          return nextWeekly(config.time, config.weekday ?? 1, from);
        case "monthly":
          return nextMonthly(config.time, config.dayOfMonth ?? 1, from);
      }
      return null;
    case "scheduled_once": {
      const runAt = new Date(config.runAt);
      if (Number.isNaN(runAt.getTime())) return null;
      return runAt > from ? runAt : null;
    }
    default:
      return null;
  }
}
