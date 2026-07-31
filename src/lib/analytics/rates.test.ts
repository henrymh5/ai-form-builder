import { describe, expect, it } from "vitest";
import { completionRate, delta, ratio } from "./rates";

describe("ratio", () => {
  it("divides normally", () => {
    expect(ratio(3, 4)).toBe(0.75);
  });

  it("returns null when the denominator is 0", () => {
    expect(ratio(5, 0)).toBeNull();
    expect(ratio(0, 0)).toBeNull();
  });
});

describe("completionRate", () => {
  it("is completions over starts", () => {
    expect(completionRate(9, 100)).toBeCloseTo(0.09);
  });

  it("is null with zero starts", () => {
    expect(completionRate(0, 0)).toBeNull();
  });
});

describe("delta", () => {
  it("is flat/0 when both periods are 0", () => {
    expect(delta(0, 0)).toEqual({ direction: "flat", ratio: 0 });
  });

  it("is up/null when the previous period was 0 but current is not (can't express as %)", () => {
    expect(delta(5, 0)).toEqual({ direction: "up", ratio: null });
  });

  it("computes a positive relative change", () => {
    const result = delta(12, 10);
    expect(result.direction).toBe("up");
    expect(result.ratio).toBeCloseTo(0.2);
  });

  it("computes a negative relative change", () => {
    const result = delta(8, 10);
    expect(result.direction).toBe("down");
    expect(result.ratio).toBeCloseTo(-0.2);
  });

  it("is flat/0 when current equals previous (non-zero)", () => {
    expect(delta(10, 10)).toEqual({ direction: "flat", ratio: 0 });
  });
});
