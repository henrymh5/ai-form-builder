import Link from "next/link";
import { FileText, Eye, MousePointerClick, Inbox } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormStatusBadge } from "@/features/form-builder/form-status-badge";
import type { WorkspaceOverview } from "@/lib/db/repositories/workspace-overview";

function formatPercent(rate: number | null): string {
  return rate === null ? "–" : `${Math.round(rate * 100)}%`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Workspace-wide KPI tiles, mirroring the per-form analytics cards (plan §13). */
function StatGrid({ totals }: { totals: WorkspaceOverview["totals"] }) {
  const stats = [
    { label: "Formulare", value: totals.formCount, icon: FileText },
    { label: "Aufrufe", value: totals.viewCount, icon: Eye },
    { label: "Gestartet", value: totals.startCount, icon: MousePointerClick },
    { label: "Antworten", value: totals.responseCount, icon: Inbox },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map(({ label, value, icon: Icon }) => (
        <Card key={label}>
          <div className="flex items-center justify-between">
            <span className="text-text-muted text-xs">{label}</span>
            <Icon className="text-text-muted size-4" />
          </div>
          <div className="text-text-primary mt-2 text-2xl font-semibold">{value}</div>
        </Card>
      ))}
    </div>
  );
}

/** Secondary figures that qualify the headline numbers above. */
function StatusSummary({ totals }: { totals: WorkspaceOverview["totals"] }) {
  return (
    <Card className="flex flex-wrap items-center gap-x-8 gap-y-3">
      <div>
        <div className="text-text-muted text-xs">Completion Rate</div>
        <div className="text-text-primary mt-1 text-lg font-semibold">
          {formatPercent(totals.completionRate)}
        </div>
      </div>
      <div>
        <div className="text-text-muted text-xs">Veröffentlicht</div>
        <div className="text-text-primary mt-1 text-lg font-semibold">{totals.publishedCount}</div>
      </div>
      <div>
        <div className="text-text-muted text-xs">Entwürfe</div>
        <div className="text-text-primary mt-1 text-lg font-semibold">{totals.draftCount}</div>
      </div>
    </Card>
  );
}

/** Recently edited forms — the "pick up where you left off" entry point. */
function RecentForms({ forms }: { forms: WorkspaceOverview["recentForms"] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-text-primary text-lg font-semibold">Zuletzt bearbeitet</h2>
        <Link href="/forms" className="text-primary-text hover:text-primary-hover text-sm">
          Alle Formulare
        </Link>
      </div>

      {forms.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
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
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <Link key={form.id} href={`/forms/${form.id}`} className="block">
              <Card className="hover:border-border-strong h-full transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="truncate">{form.title}</CardTitle>
                  <FormStatusBadge status={form.status} />
                </div>
                <div className="text-text-muted mt-3 flex gap-4 text-xs">
                  <span>{form.viewCount} Aufrufe</span>
                  <span>{form.responseCount} Antworten</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

/** Newest submissions across the whole workspace. */
function RecentResponses({ responses }: { responses: WorkspaceOverview["recentResponses"] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-text-primary text-lg font-semibold">Neueste Antworten</h2>

      {responses.length === 0 ? (
        <Card className="py-8 text-center">
          <p className="text-text-secondary text-sm">
            Sobald ein veröffentlichtes Formular ausgefüllt wird, erscheinen die Antworten hier.
          </p>
        </Card>
      ) : (
        <Card className="divide-border divide-y p-0">
          {responses.map((response) => (
            <Link
              key={response.id}
              href={`/forms/${response.formId}/responses/${response.id}`}
              className="hover:bg-surface-subtle flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="text-text-primary truncate text-sm font-medium">
                  {response.formTitle}
                </div>
                <div className="text-text-muted text-xs">{formatDate(response.submittedAt)}</div>
              </div>
              {!response.isRead ? <Badge variant="info">Neu</Badge> : null}
            </Link>
          ))}
        </Card>
      )}
    </section>
  );
}

/** Dashboard landing: workspace statistics and quick entry points (plan §4). */
export function DashboardOverview({ overview }: { overview: WorkspaceOverview }) {
  return (
    <div className="space-y-8">
      <StatGrid totals={overview.totals} />
      <StatusSummary totals={overview.totals} />
      <RecentForms forms={overview.recentForms} />
      <RecentResponses responses={overview.recentResponses} />
    </div>
  );
}
