import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Sparkline } from "./sparkline";

/**
 * The realistic silent failure for a hand-rolled SVG chart: a `NaN` in a
 * `d=` path attribute renders nothing and throws no error. Every edge case
 * here must produce a path with no "NaN" substring.
 */
describe("Sparkline", () => {
  function pathData(container: HTMLElement): string[] {
    return Array.from(container.querySelectorAll("path")).map((p) => p.getAttribute("d") ?? "");
  }

  it("never renders NaN for an empty series", () => {
    const { container } = render(<Sparkline values={[]} />);
    for (const d of pathData(container)) expect(d).not.toMatch(/NaN/);
  });

  it("never renders NaN for an all-zero series", () => {
    const { container } = render(<Sparkline values={[0, 0, 0]} />);
    for (const d of pathData(container)) expect(d).not.toMatch(/NaN/);
  });

  it("never renders NaN for a single value", () => {
    const { container } = render(<Sparkline values={[5]} />);
    for (const d of pathData(container)) expect(d).not.toMatch(/NaN/);
  });

  it("never renders NaN for a normal series", () => {
    const { container } = render(<Sparkline values={[0, 3, 7, 2, 9, 4]} />);
    for (const d of pathData(container)) expect(d).not.toMatch(/NaN/);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("falls back to a flat line (no <path>) when every value is 0", () => {
    const { container } = render(<Sparkline values={[0, 0, 0]} />);
    expect(container.querySelector("path")).toBeNull();
    expect(container.querySelector("line")).not.toBeNull();
  });
});
