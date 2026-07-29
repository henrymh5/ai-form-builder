/**
 * WCAG 2.1 contrast-ratio calculation (plan §10 "Barrierefreiheit") — pure,
 * no React/IO. Used by the Theme Editor to warn about low-contrast
 * text/background and button color combinations before publish.
 */

function hexToRgb(hex: string): [number, number, number] {
  const normalized =
    hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return [r, g, b];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [rl, gl, bl] = [channel(r), channel(g), channel(b)];
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/** WCAG contrast ratio between two hex colors, in the range [1, 21]. */
export function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexToRgb(hexA));
  const lumB = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AA requires 4.5:1 for normal text, 3:1 for large text/UI components. */
export const WCAG_AA_NORMAL_TEXT = 4.5;
export const WCAG_AA_LARGE_TEXT_OR_UI = 3;

export interface ThemeAccessibilityIssue {
  code: "LOW_TEXT_CONTRAST" | "LOW_BUTTON_CONTRAST" | "FONT_SIZE_TOO_SMALL";
  message: string;
}

/**
 * Checks the theme for the three warning conditions the plan calls out:
 * text/background contrast, button recognizability (primary color against
 * white button text), and minimum readable font size.
 */
export function checkThemeAccessibility(theme: {
  colorText: string;
  colorBackground: string;
  colorPrimary: string;
  fontSizeBase: number;
}): ThemeAccessibilityIssue[] {
  const issues: ThemeAccessibilityIssue[] = [];

  const textContrast = contrastRatio(theme.colorText, theme.colorBackground);
  if (textContrast < WCAG_AA_NORMAL_TEXT) {
    issues.push({
      code: "LOW_TEXT_CONTRAST",
      message: `Text und Hintergrund haben zu wenig Kontrast (${textContrast.toFixed(1)}:1, empfohlen mindestens ${WCAG_AA_NORMAL_TEXT}:1).`,
    });
  }

  const buttonContrast = contrastRatio(theme.colorPrimary, "#FFFFFF");
  if (buttonContrast < WCAG_AA_LARGE_TEXT_OR_UI) {
    issues.push({
      code: "LOW_BUTTON_CONTRAST",
      message: `Buttons sind mit dieser Primärfarbe schwer erkennbar (${buttonContrast.toFixed(1)}:1 gegen Weiß, empfohlen mindestens ${WCAG_AA_LARGE_TEXT_OR_UI}:1).`,
    });
  }

  if (theme.fontSizeBase < 16) {
    issues.push({
      code: "FONT_SIZE_TOO_SMALL",
      message: `Die Schriftgröße (${theme.fontSizeBase}px) ist für gute Lesbarkeit sehr klein (empfohlen mindestens 16px).`,
    });
  }

  return issues;
}
