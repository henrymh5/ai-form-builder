import { notFound } from "next/navigation";
import { getForm } from "@/lib/db/repositories/forms";
import { listResponses } from "@/lib/db/repositories/responses";
import { getWorkflow, getWorkflowWebhookSecret } from "@/lib/db/repositories/workflows";
import { WorkflowEditorClient } from "@/features/workflow-builder/workflow-editor-client";

interface WorkflowEditorPageProps {
  params: Promise<{ id: string; workflowId: string }>;
}

/** Workflow editor: React Flow canvas + palette + config panel (see workflow-editor-client.tsx). */
export default async function WorkflowEditorPage({ params }: WorkflowEditorPageProps) {
  const { id, workflowId } = await params;
  const [form, workflow] = await Promise.all([getForm(id), getWorkflow(workflowId)]);
  if (!form || !workflow || workflow.formId !== id) notFound();

  const [webhookSecret, { responses }] = await Promise.all([
    getWorkflowWebhookSecret(workflowId),
    listResponses(id, { pageSize: 10 }),
  ]);

  return (
    <WorkflowEditorClient
      workflow={workflow}
      form={form.draftDefinition}
      webhookSecret={webhookSecret}
      responses={responses}
    />
  );
}
