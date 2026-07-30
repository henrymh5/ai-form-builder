import { describe, expect, it } from "vitest";
import { windowRemainingMs, windowStartFor } from "./rate-limit-window";

const HOUR = 3_600_000;
const DAY = 86_400_000;

describe("windowStartFor", () => {
  it("floors a fixed window to its start", () => {
    const now = new Date("2026-07-30T13:47:12.000Z");
    expect(windowStartFor(HOUR, now)).toBe("2026-07-30T13:00:00.000Z");
    expect(windowStartFor(DAY, now)).toBe("2026-07-30T00:00:00.000Z");
  });

  it("maps any day of a month to the first of that month", () => {
    for (const day of ["01", "15", "31"]) {
      expect(windowStartFor("calendar-month", new Date(`2026-07-${day}T09:00:00.000Z`))).toBe(
        "2026-07-01T00:00:00.000Z",
      );
    }
  });

  it("gives consecutive months distinct windows, so a quota resets on the 1st", () => {
    const july = windowStartFor("calendar-month", new Date("2026-07-31T23:59:59.999Z"));
    const august = windowStartFor("calendar-month", new Date("2026-08-01T00:00:00.000Z"));
    expect(july).toBe("2026-07-01T00:00:00.000Z");
    expect(august).toBe("2026-08-01T00:00:00.000Z");
    expect(july).not.toBe(august);
  });

  it("rolls over the year boundary", () => {
    expect(windowStartFor("calendar-month", new Date("2026-12-31T23:00:00.000Z"))).toBe(
      "2026-12-01T00:00:00.000Z",
    );
    expect(windowStartFor("calendar-month", new Date("2027-01-01T00:30:00.000Z"))).toBe(
      "2027-01-01T00:00:00.000Z",
    );
  });

  it("keeps February distinct in a leap year", () => {
    expect(windowStartFor("calendar-month", new Date("2028-02-29T12:00:00.000Z"))).toBe(
      "2028-02-01T00:00:00.000Z",
    );
  });
});

describe("windowRemainingMs", () => {
  it("counts down to the end of a fixed window", () => {
    expect(windowRemainingMs(HOUR, new Date("2026-07-30T13:59:59.000Z"))).toBe(1000);
  });

  it("counts down to the first of the next month", () => {
    // 2026-07-31T23:59:59Z is one second before August starts.
    expect(windowRemainingMs("calendar-month", new Date("2026-07-31T23:59:59.000Z"))).toBe(1000);
  });

  it("spans the full month length from the 1st", () => {
    // July has 31 days; the whole month must remain at its very start.
    expect(windowRemainingMs("calendar-month", new Date("2026-07-01T00:00:00.000Z"))).toBe(
      31 * DAY,
    );
    // February 2028 is a leap February.
    expect(windowRemainingMs("calendar-month", new Date("2028-02-01T00:00:00.000Z"))).toBe(
      29 * DAY,
    );
  });

  it("rolls over into January across the year boundary", () => {
    expect(windowRemainingMs("calendar-month", new Date("2026-12-31T23:59:59.000Z"))).toBe(1000);
  });
});
