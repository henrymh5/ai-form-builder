import Link from "next/link";
import { ProportionBar } from "@/components/charts/proportion-bar";
import { FormStatusBadge } from "@/features/form-builder/form-status-badge";
import { completionRate } from "@/lib/analytics/rates";
import { cn } from "@/lib/cn";
import type { FormSummary } from "@/lib/db/repositories/forms";
import { formatPercent } from "./format";

/** Dense table (not a card grid) — markup pattern copied from workflow-builder/runs-table.tsx, the only precedent for a data table in this app. */
export function TopFormsTable({ forms, className }: { forms: FormSummary[]; className?: string }) {
  const maxResponses = Math.max(1, ...forms.map((f) => f.responseCount));

  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-text-primary text-base font-semibold">Top-Formulare</h2>
        <Link href="/forms" className="text-primary-text hover:text-primary-hover text-sm">
          Alle Formulare
        </Link>
      </div>

      {forms.length === 0 ? (
        <div className="border-border flex flex-col items-center gap-2 rounded-lg border px-4 py-10 text-center">
          <p className="text-text-primary text-sm font-medium">Noch keine Formulare</p>
          <p className="text-text-secondary max-w-sm text-sm">
            Erstelle dein erstes Formular per KI-Beschreibung, aus einer Vorlage oder ganz von Grund
            auf.
          </p>
          <Link
            href="/forms"
            className="text-primary-text hover:text-primary-hover mt-1 text-sm font-medium"
          >
            Zu den Formularen
          </Link>
        </div>
      ) : (
        <div className="border-border overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-surface-subtle text-text-secondary border-b text-left">
                <th className="px-4 py-2 font-medium">Formular</th>
                <th className="px-4 py-2 font-medium">Aufrufe</th>
                <th className="px-4 py-2 font-medium">Antworten</th>
                <th className="px-4 py-2 font-medium">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((form) => (
                <tr
                  key={form.id}
                  className="border-border hover:bg-surface-subtle border-b last:border-0"
                >
                  <td className="max-w-0 px-4 py-2">
                    <Link href={`/forms/${form.id}`} className="flex min-w-0 items-center gap-2">
                      <span className="text-text-primary truncate font-medium">{form.title}</span>
                      <FormStatusBadge status={form.status} className="shrink-0" />
                    </Link>
                  </td>
                  <td className="text-text-secondary px-4 py-2">{form.viewCount}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-text-secondary w-6 shrink-0 text-right">
                        {form.responseCount}
                      </span>
                      <ProportionBar
                        value={form.responseCount}
                        max={maxResponses}
                        ariaLabel={`${form.responseCount} Antworten für ${form.title}`}
                        size="sm"
                        className={cn(form.responseCount > 0 ? "bg-primary" : "bg-transparent")}
                      />
                    </div>
                  </td>
                  <td className="text-text-secondary px-4 py-2">
                    {formatPercent(completionRate(form.completionCount, form.startCount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
