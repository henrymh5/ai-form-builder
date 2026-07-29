import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkflow } from "@/lib/db/repositories/workflows";
import {
  listWorkflowRunSteps,
  listWorkflowRuns,
  type WorkflowRunStepRecord,
} from "@/lib/db/repositories/workflow-runs";
import { Card } from "@/components/ui/card";
import { RunsTable } from "@/features/workflow-builder/runs-table";

interface RunsPageProps {
  params: Promise<{ id: string; workflowId: string }>;
  searchParams: Promise<{ page?: string }>;
}

const PAGE_SIZE = 20;

/** Run history for a workflow: status, attempt, error, expandable step log, retry. */
export default async function RunsPage({ params, searchParams }: RunsPageProps) {
  const { id, workflowId } = await params;
  const search = await searchParams;
  const workflow = await getWorkflow(workflowId);
  if (!workflow || workflow.formId !== id) notFound();

  const page = Math.max(1, Number(search.page) || 1);
  const { runs, total } = await listWorkflowRuns(workflowId, { page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const stepsByRunId: Record<string, WorkflowRunStepRecord[]> = {};
  await Promise.all(
    runs.map(async (run) => {
      stepsByRunId[run.id] = await listWorkflowRunSteps(run.id);
    }),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <Link
          href={`/forms/${id}/workflows`}
          className="text-text-secondary hover:text-text-primary text-sm"
        >
          ← Workflows
        </Link>
        <h1 className="text-text-primary text-2xl font-semibold">Läufe: {workflow.name}</h1>
      </div>

      {runs.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-text-primary text-sm font-medium">Noch keine Läufe</p>
          <p className="text-text-secondary max-w-sm text-sm">
            Sobald eine Antwort eingeht, während dieser Workflow aktiviert ist, erscheint hier der
            erste Lauf.
          </p>
        </Card>
      ) : (
        <RunsTable formId={id} workflowId={workflowId} runs={runs} stepsByRunId={stepsByRunId} />
      )}

      {totalPages > 1 ? (
        <div className="text-text-secondary flex items-center justify-between text-sm">
          <span>
            Seite {page} von {totalPages} · {total} Läufe
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={`/forms/${id}/workflows/${workflowId}/runs?page=${page - 1}`}
                className="text-primary-text hover:underline"
              >
                Zurück
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={`/forms/${id}/workflows/${workflowId}/runs?page=${page + 1}`}
                className="text-primary-text hover:underline"
              >
                Weiter
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
