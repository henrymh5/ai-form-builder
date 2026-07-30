/**
 * Window maths for the fixed-window rate limiter.
 *
 * Pure and free of `server-only`/DB imports so it can be unit-tested directly — the
 * calendar-month case in particular has enough edge cases (year rollover, leap years,
 * month lengths) to be worth testing without a database.
 */

/** Fixed window length in ms, or a calendar month for quotas that reset on the 1st. */
export type RateLimitWindow = number | "calendar-month";

/**
 * Start of the window `now` falls into, as an ISO string.
 *
 * Calendar months are computed in UTC so the boundary does not shift with the server's
 * timezone or with daylight-saving changes.
 */
export function windowStartFor(window: RateLimitWindow, now: Date): string {
  if (window === "calendar-month") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  }
  return new Date(Math.floor(now.getTime() / window) * window).toISOString();
}

/** Milliseconds until the current window ends — used for the `retryAfterMs` hint. */
export function windowRemainingMs(window: RateLimitWindow, now: Date): number {
  if (window === "calendar-month") {
    // Month index 12 rolls over to January of the next year automatically.
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - now.getTime();
  }
  return window - (now.getTime() % window);
}
