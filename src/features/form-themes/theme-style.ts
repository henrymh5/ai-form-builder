import type { CSSProperties } from "react";
import type { Theme } from "@/lib/form-schema/theme";

/**
 * Maps the theme's font enum to a concrete stack.
 *
 * Only websafe/system families, so a themed form needs no webfont request — and because
 * the value is an enum rather than a free-form string, no user input ever reaches CSS.
 */
const FONT_STACK: Record<Theme["fontFamily"], string> = {
  inter: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
  system: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
  times: "'Times New Roman', Times, serif",
  garamond: "Garamond, 'EB Garamond', Georgia, serif",
  helvetica: "Helvetica, Arial, sans-serif",
  verdana: "Verdana, Geneva, sans-serif",
  trebuchet: "'Trebuchet MS', 'Lucida Grande', sans-serif",
  tahoma: "Tahoma, Geneva, Verdana, sans-serif",
  courier: "'Courier New', Courier, monospace",
  mono: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace",
};

/** Human-readable labels for the font picker. */
export const FONT_LABEL: Record<Theme["fontFamily"], string> = {
  inter: "Inter",
  system: "System",
  georgia: "Georgia",
  times: "Times New Roman",
  garamond: "Garamond",
  helvetica: "Helvetica",
  verdana: "Verdana",
  trebuchet: "Trebuchet MS",
  tahoma: "Tahoma",
  courier: "Courier New",
  mono: "Monospace",
};

/** Vertical rhythm between fields, in px. */
const SPACING_GAP: Record<Theme["spacing"], number> = {
  compact: 16,
  comfortable: 24,
  spacious: 32,
};

/**
 * Darkens a hex colour by `amount` (0–1), used for the primary button's hover state.
 * Kept deterministic and dependency-free — the value is already validated as hex by the
 * theme schema, so parsing cannot fail here.
 */
function darken(hex: string, amount: number): string {
  const full =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex.toLowerCase();
  const channels = [1, 3, 5].map((i) => {
    const value = Number.parseInt(full.slice(i, i + 2), 16);
    return Math.max(0, Math.round(value * (1 - amount)));
  });
  return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Relative luminance per WCAG, used to pick readable text on the primary colour. */
function luminance(hex: string): number {
  const full =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex.toLowerCase();
  const channelAt = (offset: number): number => {
    const channel = Number.parseInt(full.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channelAt(1) + 0.7152 * channelAt(3) + 0.0722 * channelAt(5);
}

/**
 * Turns a form theme into inline CSS custom properties for the form container.
 *
 * Applied as a `style` prop rather than a stylesheet so each form carries its own values,
 * and scoped to `--form-*` names so the product UI's own tokens stay untouched
 * (Style-Guide §23.16 "klare Trennung Produkt-UI vs. Formular-Theme").
 */
export function themeToStyle(theme: Theme): CSSProperties {
  const gap = SPACING_GAP[theme.spacing];

  return {
    "--form-color-primary": theme.colorPrimary,
    "--form-color-primary-hover": darken(theme.colorPrimary, 0.15),
    // Black text on light accents, white on dark ones — 0.5 is the usual split point.
    "--form-color-on-primary": luminance(theme.colorPrimary) > 0.5 ? "#0F172A" : "#FFFFFF",
    "--form-color-background": theme.colorBackground,
    "--form-color-text": theme.colorText,
    // Muted/border tones are derived so a themed form stays coherent without asking the
    // user to pick five colours.
    "--form-color-muted": `color-mix(in srgb, ${theme.colorText} 62%, ${theme.colorBackground})`,
    "--form-color-border": `color-mix(in srgb, ${theme.colorText} 20%, ${theme.colorBackground})`,
    "--form-color-surface": `color-mix(in srgb, ${theme.colorBackground} 92%, #FFFFFF)`,
    "--form-font-family": FONT_STACK[theme.fontFamily],
    "--form-font-size": `${theme.fontSizeBase}px`,
    "--form-radius": `${theme.borderRadius}px`,
    "--form-gap": `${gap}px`,
    "--form-container-width": `${theme.containerWidth}px`,
    fontFamily: "var(--form-font-family)",
    fontSize: "var(--form-font-size)",
    color: "var(--form-color-text)",
    background: "var(--form-color-background)",
  } as CSSProperties;
}
