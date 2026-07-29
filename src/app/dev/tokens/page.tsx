/**
 * Internal design-token demo route (Ticket 0.3 DoD: "Token-Demo-Seite zeigt
 * Palette/Skalen"). Not part of the product surface — a visual reference for
 * the tokens defined in globals.css / plan §23.
 */

const tealSteps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

const neutralSwatches = [
  { label: "Background", varName: "--background" },
  { label: "Surface", varName: "--surface" },
  { label: "Surface Subtle", varName: "--surface-subtle" },
  { label: "Border", varName: "--border" },
  { label: "Border Strong", varName: "--border-strong" },
] as const;

const semanticSwatches = [
  { label: "Success", varName: "--success", subtleVar: "--success-subtle" },
  { label: "Warning", varName: "--warning", subtleVar: "--warning-subtle" },
  { label: "Error", varName: "--error", subtleVar: "--error-subtle" },
  { label: "Info", varName: "--info", subtleVar: "--info-subtle" },
] as const;

const typeScale = [
  { label: "Page Title", size: "28px / 36", weight: 600, className: "text-2xl font-semibold" },
  { label: "Section Title", size: "20px / 28", weight: 600, className: "text-xl font-semibold" },
  { label: "Card Title", size: "16px / 24", weight: 600, className: "text-base font-semibold" },
  { label: "Body", size: "14px / 22", weight: 400, className: "text-sm" },
  { label: "UI Label", size: "13px / 20", weight: 500, className: "text-[13px] font-medium" },
  { label: "Helper / Meta", size: "12px / 18", weight: 400, className: "text-xs" },
] as const;

const spacingSteps = [1, 2, 3, 4, 5, 6, 8, 10, 12] as const;
const radiusSteps = ["sm", "md", "lg", "xl"] as const;
const shadowSteps = ["sm", "md", "overlay"] as const;

export default function TokensDemoPage() {
  return (
    <div className="mx-auto max-w-(--layout-content-max) space-y-12 p-8">
      <header>
        <h1 className="text-text-primary text-2xl font-semibold">Design Tokens</h1>
        <p className="text-text-secondary mt-1 text-sm">
          Referenzansicht der Tokens aus globals.css / Masterplan §23. Nicht Teil der
          Produktoberfläche.
        </p>
      </header>

      <section>
        <h2 className="text-text-primary mb-4 text-xl font-semibold">Teal-Skala (Primär)</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-11">
          {tealSteps.map((step) => (
            <div key={step} className="flex flex-col gap-1">
              <div
                className="border-border h-16 rounded-md border"
                style={{ backgroundColor: `var(--teal-${step})` }}
              />
              <span className="text-text-muted text-xs">{step}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-text-primary mb-4 text-xl font-semibold">Neutrale Farben</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {neutralSwatches.map((s) => (
            <div key={s.label} className="flex flex-col gap-1">
              <div
                className="border-border h-16 rounded-md border"
                style={{ backgroundColor: `var(${s.varName})` }}
              />
              <span className="text-text-muted text-xs">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-text-primary mb-4 text-xl font-semibold">Semantische Farben</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {semanticSwatches.map((s) => (
            <div key={s.label} className="flex flex-col gap-1">
              <div
                className="border-border flex h-16 items-center justify-center rounded-md border text-sm font-medium"
                style={{
                  backgroundColor: `var(${s.subtleVar})`,
                  color: `var(${s.varName})`,
                }}
              >
                Aa
              </div>
              <span className="text-text-muted text-xs">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-text-primary mb-4 text-xl font-semibold">Typografie-Skala</h2>
        <div className="border-border bg-surface space-y-3 rounded-lg border p-6">
          {typeScale.map((t) => (
            <div key={t.label} className="flex items-baseline gap-4">
              <span className={`${t.className} text-text-primary`}>{t.label}</span>
              <span className="text-text-muted text-xs">
                {t.size} · {t.weight}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-text-primary mb-4 text-xl font-semibold">Spacing (4px-Basis)</h2>
        <div className="flex flex-wrap items-end gap-3">
          {spacingSteps.map((step) => (
            <div key={step} className="flex flex-col items-center gap-1">
              <div
                className="bg-primary"
                style={{ width: `var(--spacing-${step})`, height: `var(--spacing-${step})` }}
              />
              <span className="text-text-muted text-xs">{step}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-text-primary mb-4 text-xl font-semibold">Radien</h2>
        <div className="flex flex-wrap gap-4">
          {radiusSteps.map((step) => (
            <div key={step} className="flex flex-col items-center gap-1">
              <div
                className="border-border bg-surface-subtle h-16 w-16 border"
                style={{ borderRadius: `var(--radius-${step})` }}
              />
              <span className="text-text-muted text-xs">{step}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-text-primary mb-4 text-xl font-semibold">Schatten</h2>
        <div className="flex flex-wrap gap-6">
          {shadowSteps.map((step) => (
            <div key={step} className="flex flex-col items-center gap-2">
              <div
                className="bg-surface h-16 w-24 rounded-lg"
                style={{ boxShadow: `var(--shadow-${step})` }}
              />
              <span className="text-text-muted text-xs">shadow-{step}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
