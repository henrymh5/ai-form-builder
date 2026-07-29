import Link from "next/link";
import { notFound } from "next/navigation";
import { getResponse, markResponseRead } from "@/lib/db/repositories/responses";
import { getFormVersion } from "@/lib/db/repositories/form-versions";
import { listWorkflowRunsForResponse } from "@/lib/db/repositories/workflow-runs";
import { ResponseDetailView } from "@/features/form-responses/response-detail-view";

interface ResponseDetailPageProps {
  params: Promise<{ id: string; responseId: string }>;
}

/**
 * Response detail (plan §8): renders answers against the response's OWN
 * form version — never the form's current draft — so labels/options
 * reflect what the respondent actually saw, even after later edits.
 */
export default async function ResponseDetailPage({ params }: ResponseDetailPageProps) {
  const { id, responseId } = await params;
  const response = await getResponse(responseId);
  if (!response || response.formId !== id) notFound();

  const version = await getFormVersion(response.formVersionId);
  if (!version) notFound();

  if (!response.isRead) {
    await markResponseRead(responseId);
  }

  const workflowRuns = await listWorkflowRunsForResponse(responseId);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Link
        href={`/forms/${id}/responses`}
        className="text-text-secondary hover:text-text-primary text-sm"
      >
        ← Antworten
      </Link>

      <ResponseDetailView
        formId={id}
        response={response}
        definition={version.definition}
        workflowRuns={workflowRuns}
      />
    </div>
  );
}
