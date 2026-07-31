import { describe, expect, it } from "vitest";
import { areaPath, donutDashArray, linePath, niceMax, yTicks } from "./chart-scale";

describe("niceMax", () => {
  it("returns 1 for zero or negative input", () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(-5)).toBe(1);
  });

  it("is always >= the raw input", () => {
    for (const raw of [1, 2, 2.1, 5, 7, 9.9, 10, 23, 99, 100, 137, 999, 10000]) {
      expect(niceMax(raw)).toBeGreaterThanOrEqual(raw);
    }
  });

  it("is monotonically non-decreasing", () => {
    const inputs = [1, 3, 7, 12, 23, 48, 90, 137, 500, 999];
    let previous = 0;
    for (const raw of inputs) {
      const value = niceMax(raw);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it("only ever returns 1/2/5 times a power of ten", () => {
    for (const raw of [1, 7, 23, 137, 4200]) {
      const value = niceMax(raw);
      const exponent = Math.floor(Math.log10(value));
      const fraction = value / 10 ** exponent;
      expect([1, 2, 5]).toContain(Math.round(fraction * 100) / 100);
    }
  });
});

describe("yTicks", () => {
  it("returns count+1 evenly spaced values from 0 to max", () => {
    expect(yTicks(100, 4)).toEqual([0, 25, 50, 75, 100]);
  });

  it("defaults to 4 intervals", () => {
    expect(yTicks(40)).toHaveLength(5);
  });

  it("guards max <= 0", () => {
    expect(yTicks(0)).toEqual([0]);
    expect(yTicks(-10)).toEqual([0]);
  });
});

describe("linePath / areaPath", () => {
  it("returns an empty string for fewer than 2 values", () => {
    expect(linePath([], 10, 100, 40)).toBe("");
    expect(linePath([5], 10, 100, 40)).toBe("");
    expect(areaPath([5], 10, 100, 40)).toBe("");
  });

  it("returns an empty string when max <= 0 (never divides by zero)", () => {
    expect(linePath([1, 2, 3], 0, 100, 40)).toBe("");
    expect(areaPath([1, 2, 3], 0, 100, 40)).toBe("");
  });

  it("never produces NaN in the path for a normal series", () => {
    const d = linePath([0, 5, 10, 3, 8], 10, 100, 40);
    expect(d).not.toMatch(/NaN/);
    expect(d.startsWith("M")).toBe(true);
  });

  it("areaPath closes down to the baseline", () => {
    const d = areaPath([1, 2], 2, 100, 40);
    expect(d).not.toMatch(/NaN/);
    expect(d).toContain("L100,40L0,40Z");
  });
});

describe("donutDashArray", () => {
  it("returns [] when every value is 0", () => {
    expect(donutDashArray([0, 0, 0], 10)).toEqual([]);
  });

  it("dash lengths sum to the circumference", () => {
    const radius = 10;
    const circumference = 2 * Math.PI * radius;
    const segments = donutDashArray([3, 1, 6], radius);
    const total = segments.reduce((sum, s) => sum + Number(s.dash.split(" ")[0]), 0);
    expect(total).toBeCloseTo(circumference);
  });

  it("handles a single 100% segment without a degenerate dash", () => {
    const radius = 10;
    const circumference = 2 * Math.PI * radius;
    const segments = donutDashArray([5], radius);
    expect(segments).toHaveLength(1);
    expect(Number(segments[0]!.dash.split(" ")[0])).toBeCloseTo(circumference);
  });

  it("offsets accumulate across segments", () => {
    const segments = donutDashArray([1, 1, 1, 1], 10);
    expect(segments[0]!.offset).toBeCloseTo(0); // -0 from -cumulative at the first segment, equal in value
    expect(segments[1]!.offset).toBeLessThan(0);
    expect(segments[2]!.offset).toBeLessThan(segments[1]!.offset);
  });
});
