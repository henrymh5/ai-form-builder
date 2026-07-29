import "server-only";
import { customAlphabet } from "nanoid";
import { AppError } from "@/lib/errors";
import { createUserClient } from "@/lib/db/user-client";
import { CURRENT_WORKFLOW_SCHEMA_VERSION, type WorkflowDefinition } from "@/lib/workflow-schema/schema";
import { createEmptyWorkflowDefinition } from "@/lib/workflow-schema/factory";

/**
 * Authenticated (RLS-enforced) access to workflows — mirrors
 * lib/db/repositories/forms.ts. Runs (workflow_runs/workflow_run_steps) are
 * server-role-only and live in workflow-runs.ts instead.
 */

export type WorkflowStatus = "enabled" | "paused";

export interface WorkflowSummary {
  id: string;
  formId: string;
  name: string;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRecord extends WorkflowSummary {
  definition: WorkflowDefinition;
  schemaVersion: number;
  createdBy: string | null;
}

const webhookSecretAlphabet = customAlphabet(
  "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ",
  32,
);

function mapRow(data: {
  id: string;
  form_id: string;
  name: string;
  status: string;
  definition: unknown;
  schema_version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}): WorkflowRecord {
  return {
    id: data.id,
    formId: data.form_id,
    name: data.name,
    status: data.status as WorkflowStatus,
    definition: data.definition as unknown as WorkflowDefinition,
    schemaVersion: data.schema_version,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function listWorkflows(formId: string): Promise<WorkflowRecord[]> {
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("workflows")
    .select("*")
    .eq("form_id", formId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new AppError("INTERNAL_ERROR", "Workflows konnten nicht geladen werden.", {
      cause: error,
    });
  }

  return (data ?? []).map(mapRow);
}

export async function getWorkflow(workflowId: string): Promise<WorkflowRecord | null> {
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("workflows")
    .select("*")
    .eq("id", workflowId)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL_ERROR", "Workflow konnte nicht geladen werden.", { cause: error });
  }
  if (!data) return null;

  return mapRow(data);
}

export async function createWorkflow(params: {
  formId: string;
  name: string;
  userId: string;
  definition?: WorkflowDefinition;
  status?: WorkflowStatus;
}): Promise<WorkflowRecord> {
  const supabase = await createUserClient();
  const definition = params.definition ?? createEmptyWorkflowDefinition();

  const { data, error } = await supabase
    .from("workflows")
    .insert({
      form_id: params.formId,
      name: params.name,
      status: params.status ?? "paused",
      definition: definition as never,
      schema_version: CURRENT_WORKFLOW_SCHEMA_VERSION,
      webhook_secret: webhookSecretAlphabet(),
      created_by: params.userId,
    })
    .select("*")
    .single();

  if (error) {
    throw new AppError("FORBIDDEN", "Workflow konnte nicht erstellt werden.", { cause: error });
  }

  return mapRow(data);
}

export async function saveWorkflowDefinition(
  workflowId: string,
  definition: WorkflowDefinition,
): Promise<void> {
  const supabase = await createUserClient();
  const { error } = await supabase
    .from("workflows")
    .update({ definition: definition as never, updated_at: new Date().toISOString() })
    .eq("id", workflowId);

  if (error) {
    throw new AppError("FORBIDDEN", "Workflow konnte nicht gespeichert werden.", { cause: error });
  }
}

export async function renameWorkflow(workflowId: string, name: string): Promise<void> {
  const supabase = await createUserClient();
  const { error } = await supabase.from("workflows").update({ name }).eq("id", workflowId);
  if (error) {
    throw new AppError("FORBIDDEN", "Workflow konnte nicht umbenannt werden.", { cause: error });
  }
}

export async function setWorkflowStatus(
  workflowId: string,
  status: WorkflowStatus,
): Promise<void> {
  const supabase = await createUserClient();
  const { error } = await supabase.from("workflows").update({ status }).eq("id", workflowId);
  if (error) {
    throw new AppError("FORBIDDEN", "Workflow-Status konnte nicht geändert werden.", {
      cause: error,
    });
  }
}

export async function deleteWorkflow(workflowId: string): Promise<void> {
  const supabase = await createUserClient();
  const { error } = await supabase.from("workflows").delete().eq("id", workflowId);
  if (error) {
    throw new AppError("FORBIDDEN", "Workflow konnte nicht gelöscht werden.", { cause: error });
  }
}

export async function getWorkflowWebhookSecret(workflowId: string): Promise<string | null> {
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("workflows")
    .select("webhook_secret")
    .eq("id", workflowId)
    .maybeSingle();
  if (error) {
    throw new AppError("INTERNAL_ERROR", "Webhook-Secret konnte nicht geladen werden.", {
      cause: error,
    });
  }
  return data?.webhook_secret ?? null;
}
