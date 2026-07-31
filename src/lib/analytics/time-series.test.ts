import { describe, expect, it } from "vitest";
import { buildDayRange, dayKey } from "./time-series";

describe("dayKey", () => {
  it("buckets by local calendar day, not UTC (the toISOString().slice(0,10) regression)", () => {
    // 2026-01-15T23:30:00Z is 2026-01-16T00:30 CET (UTC+1) — must bucket to the 16th.
    expect(dayKey("2026-01-15T23:30:00.000Z", "Europe/Berlin")).toBe("2026-01-16");
  });

  it("stays on the same UTC day when local time hasn't crossed midnight", () => {
    expect(dayKey("2026-01-15T10:00:00.000Z", "Europe/Berlin")).toBe("2026-01-15");
  });

  it("handles the summer UTC+2 offset the same way", () => {
    // 2026-06-15T22:30:00Z is 2026-06-16T00:30 CEST (UTC+2) — must bucket to the 16th.
    expect(dayKey("2026-06-15T22:30:00.000Z", "Europe/Berlin")).toBe("2026-06-16");
  });
});

describe("buildDayRange", () => {
  it("returns `days` ascending keys ending on the end date", () => {
    const range = buildDayRange(new Date("2026-01-31T12:00:00.000Z"), 5, "Europe/Berlin");
    expect(range).toEqual(["2026-01-27", "2026-01-28", "2026-01-29", "2026-01-30", "2026-01-31"]);
  });

  it("crosses the spring-forward DST boundary (2026-03-29, Europe/Berlin) without a gap or duplicate", () => {
    const range = buildDayRange(new Date("2026-04-05T12:00:00.000Z"), 30, "Europe/Berlin");
    expect(range).toHaveLength(30);
    expect(new Set(range).size).toBe(30); // no duplicates
    expect(range).toContain("2026-03-29");
    expect(range[range.length - 1]).toBe("2026-04-05");
    // Strictly ascending, one calendar day apart.
    for (let i = 1; i < range.length; i++) {
      const prev = new Date(`${range[i - 1]}T12:00:00.000Z`);
      const cur = new Date(`${range[i]}T12:00:00.000Z`);
      expect(cur.getTime() - prev.getTime()).toBe(24 * 60 * 60 * 1000);
    }
  });

  it("crosses the fall-back DST boundary (2026-10-25, Europe/Berlin) without a gap or duplicate", () => {
    const range = buildDayRange(new Date("2026-11-01T12:00:00.000Z"), 14, "Europe/Berlin");
    expect(range).toHaveLength(14);
    expect(new Set(range).size).toBe(14);
    expect(range).toContain("2026-10-25");
  });
});
