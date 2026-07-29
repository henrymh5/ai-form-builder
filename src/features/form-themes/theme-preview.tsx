import type { Theme } from "@/lib/form-schema/theme";

const SPACING_PADDING: Record<Theme["spacing"], string> = {
  compact: "0.75rem",
  comfortable: "1.25rem",
  spacious: "2rem",
};

/**
 * Renders a small sample field + button styled from theme tokens only —
 * plan §10 "Nicht jedes Element sollte beliebig mit Inline-Styles verändert
 * werden": every value here comes from the enumerated `Theme` shape, never
 * from free-form user CSS. Shared by the builder's Theme Editor dialog and
 * (in Phase 13) the public form renderer, so both always agree on what a
 * theme actually looks like.
 */
export function ThemePreview({ theme }: { theme: Theme }) {
  return (
    <div
      style={{
        backgroundColor: theme.colorBackground,
        color: theme.colorText,
        fontFamily:
          theme.fontFamily === "inter" ? "var(--font-inter), sans-serif" : "system-ui, sans-serif",
        fontSize: `${theme.fontSizeBase}px`,
        maxWidth: theme.containerWidth,
        padding: SPACING_PADDING[theme.spacing],
        borderRadius: theme.borderRadius,
      }}
      className="space-y-4 border"
    >
      <div>
        <label className="mb-1.5 block text-sm font-medium">Deine E-Mail-Adresse</label>
        <input
          disabled
          placeholder="name@beispiel.de"
          style={{
            borderRadius: theme.borderRadius,
            borderColor: theme.inputStyle === "outline" ? theme.colorText + "40" : "transparent",
            backgroundColor: theme.inputStyle === "filled" ? theme.colorText + "0d" : "transparent",
          }}
          className="w-full border px-3 py-2 text-sm"
        />
      </div>

      <button
        type="button"
        disabled
        style={{
          borderRadius: theme.borderRadius,
          backgroundColor: theme.buttonStyle === "solid" ? theme.colorPrimary : "transparent",
          color: theme.buttonStyle === "solid" ? "#FFFFFF" : theme.colorPrimary,
          borderColor: theme.colorPrimary,
        }}
        className="border px-4 py-2 text-sm font-medium"
      >
        Weiter
      </button>
    </div>
  );
}
