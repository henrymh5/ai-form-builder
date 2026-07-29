import { describe, expect, it } from "vitest";
import { checkThemeAccessibility, contrastRatio } from "./contrast";

describe("contrastRatio", () => {
  it("returns 21 for black on white (maximum contrast)", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
  });

  it("returns 1 for identical colors", () => {
    expect(contrastRatio("#0D9488", "#0D9488")).toBeCloseTo(1, 5);
  });

  it("is symmetric regardless of argument order", () => {
    const a = contrastRatio("#0F172A", "#F8FAFC");
    const b = contrastRatio("#F8FAFC", "#0F172A");
    expect(a).toBeCloseTo(b, 5);
  });

  it("handles 3-digit hex shorthand", () => {
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 0);
  });
});

describe("checkThemeAccessibility", () => {
  const goodTheme = {
    colorText: "#0F172A",
    colorBackground: "#F8FAFC",
    colorPrimary: "#0D9488",
    fontSizeBase: 16,
  };

  it("reports no issues for a well-contrasted, readable theme", () => {
    expect(checkThemeAccessibility(goodTheme)).toEqual([]);
  });

  it("flags low text/background contrast", () => {
    const issues = checkThemeAccessibility({
      ...goodTheme,
      colorText: "#CCCCCC",
      colorBackground: "#FFFFFF",
    });
    expect(issues.some((i) => i.code === "LOW_TEXT_CONTRAST")).toBe(true);
  });

  it("flags a low-contrast primary/button color", () => {
    const issues = checkThemeAccessibility({ ...goodTheme, colorPrimary: "#FFFF00" });
    expect(issues.some((i) => i.code === "LOW_BUTTON_CONTRAST")).toBe(true);
  });

  it("flags a font size below 16px", () => {
    const issues = checkThemeAccessibility({ ...goodTheme, fontSizeBase: 14 });
    expect(issues.some((i) => i.code === "FONT_SIZE_TOO_SMALL")).toBe(true);
  });
});
