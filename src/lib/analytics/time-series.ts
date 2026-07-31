/**
 * Calendar-day bucketing for the workspace activity chart — pure, no DB
 * access, so this stays a plain unit-testable module (unlike
 * lib/db/repositories/*, which are `server-only`).
 *
 * `dayKey` deliberately does NOT use `date.toISOString().slice(0, 10)` —
 * that buckets in UTC, so anything submitted between 00:00 and 01:00/02:00
 * local time (Europe/Berlin is UTC+1/+2) would land in "yesterday" on the
 * chart. Every bucket boundary must agree with how the rest of the app
 * displays dates (`de-DE`, implicitly local time).
 */

export const APP_TIME_ZONE = "Europe/Berlin";

const dayKeyFormatters = new Map<string, Intl.DateTimeFormat>();

function dayKeyFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = dayKeyFormatters.get(timeZone);
  if (!formatter) {
    // en-CA renders as YYYY-MM-DD natively — no manual field reassembly.
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    dayKeyFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/** The "YYYY-MM-DD" calendar day `iso` falls on in `timeZone`. */
export function dayKey(iso: string, timeZone: string = APP_TIME_ZONE): string {
  return dayKeyFormatter(timeZone).format(new Date(iso));
}

/**
 * `days` ascending calendar-day keys ending on the day `end` falls on,
 * inclusive. Anchored at noon UTC on each step so a 23h/25h DST-transition
 * day never causes a duplicated or skipped bucket: stepping by exactly 24h
 * from a noon-UTC instant can only ever land on the next/previous calendar
 * day in Europe/Berlin, since local noon there is always UTC+1 or UTC+2 —
 * nowhere near a midnight boundary.
 */
export function buildDayRange(end: Date, days: number, timeZone: string = APP_TIME_ZONE): string[] {
  const endKey = dayKey(end.toISOString(), timeZone);
  const noonAnchor = new Date(`${endKey}T12:00:00.000Z`).getTime();

  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const instant = new Date(noonAnchor - i * 24 * 60 * 60 * 1000);
    keys.push(dayKey(instant.toISOString(), timeZone));
  }
  return keys;
}
