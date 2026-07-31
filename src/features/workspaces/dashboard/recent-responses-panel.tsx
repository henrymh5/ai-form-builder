import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { RecentResponse } from "@/lib/db/repositories/workspace-overview";
import { formatDate } from "./format";

/** Newest submissions across the whole workspace — unchanged from the previous dashboard-overview.tsx's RecentResponses. */
export function RecentResponsesPanel({ responses }: { responses: RecentResponse[] }) {
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
