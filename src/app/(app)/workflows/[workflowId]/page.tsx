import { notFound } from "next/navigation";
import { listFormOptionsWithDefinitions } from "@/lib/db/repositories/forms";
import { listResponses } from "@/lib/db/repositories/responses";
import {
  getWorkflow,
  getWorkflowInboundToken,
  getWorkflowWebhookSecret,
} from "@/lib/db/repositories/workflows";
import { WorkflowEditorClient } from "@/features/workflow-builder/workflow-editor-client";
import type { TestRunResponseOption } from "@/features/workflow-builder/test-run-dialog";

interface WorkflowEditorPageProps {
  params: Promise<{ workflowId: string }>;
}

const RESPONSES_PER_FORM = 10;

/** Workflow editor: React Flow canvas + palette + config panel (see workflow-editor-client.tsx). */
export default async function WorkflowEditorPage({ params }: WorkflowEditorPageProps) {
  const { workflowId } = await params;
  const workflow = await getWorkflow(workflowId);
  if (!workflow) notFound();

  const [webhookSecret, inboundToken, forms] = await Promise.all([
    getWorkflowWebhookSecret(workflowId),
    getWorkflowInboundToken(workflowId),
    listFormOptionsWithDefinitions(workflow.workspaceId),
  ]);

  const formTitleById = Object.fromEntries(forms.map((f) => [f.id, f.title]));
  const triggerForms = forms.filter((f) => workflow.triggerFormIds.includes(f.id));

  const responsesByForm = await Promise.all(
    triggerForms.map((form) => listResponses(form.id, { pageSize: RESPONSES_PER_FORM })),
  );
  const responses: TestRunResponseOption[] = triggerForms.flatMap((form, i) =>
    responsesByForm[i]!.responses.map((r) => ({
      id: r.id,
      formTitle: formTitleById[form.id] ?? form.title,
      submittedAt: r.submittedAt,
    })),
  );

  return (
    <WorkflowEditorClient
      workflow={workflow}
      forms={forms}
      webhookSecret={webhookSecret}
      inboundToken={inboundToken}
      responses={responses}
    />
  );
}
