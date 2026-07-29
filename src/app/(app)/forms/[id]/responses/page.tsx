import Link from "next/link";
import { notFound } from "next/navigation";
import { getForm } from "@/lib/db/repositories/forms";
import { listResponses, type ResponseStatus } from "@/lib/db/repositories/responses";
import { ResponsesToolbar } from "@/features/form-responses/responses-toolbar";
import { ResponsesTable } from "@/features/form-responses/responses-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const VALID_STATUSES: ResponseStatus[] = ["completed", "test", "spam", "archived"];
const PAGE_SIZE = 20;

interface ResponsesPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}

/** Response list (plan §8 Antwortverwaltung): filter, pagination, per-row actions. */
export default async function ResponsesPage({ params, searchParams }: ResponsesPageProps) {
  const { id } = await params;
  const search = await searchParams;
  const form = await getForm(id);
  if (!form) notFound();

  const status = VALID_STATUSES.find((s) => s === search.status);
  const page = Math.max(1, Number(search.page) || 1);

  const { responses, total } = await listResponses(id, {
    status,
    page,
    pageSize: PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    params.set("page", String(targetPage));
    return `/forms/${id}/responses?${params.toString()}`;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/forms/${id}`}
            className="text-text-secondary hover:text-text-primary text-sm"
          >
            ← {form.title}
          </Link>
          <h1 className="text-text-primary text-2xl font-semibold">Antworten</h1>
        </div>
        <Button variant="secondary" size="sm" asChild>
          <a
            href={`/api/forms/${id}/responses/export${status ? `?status=${status}` : ""}`}
            download
          >
            CSV exportieren
          </a>
        </Button>
      </div>

      <ResponsesToolbar />

      {responses.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-text-primary text-sm font-medium">
            {search.status ? "Keine Antworten in diesem Status" : "Noch keine Antworten"}
          </p>
        </Card>
      ) : (
        <ResponsesTable formId={id} responses={responses} />
      )}

      {totalPages > 1 ? (
        <div className="text-text-secondary flex items-center justify-between text-sm">
          <span>
            Seite {page} von {totalPages} · {total} Antworten
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className="text-primary-text hover:underline">
                Zurück
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link href={pageHref(page + 1)} className="text-primary-text hover:underline">
                Weiter
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
