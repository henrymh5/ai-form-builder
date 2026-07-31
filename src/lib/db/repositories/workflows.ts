import "server-only";
import { customAlphabet } from "nanoid";
import { AppError } from "@/lib/errors";
import { createUserClient } from "@/lib/db/user-client";
import {
  CURRENT_WORKFLOW_SCHEMA_VERSION,
  type WorkflowDefinition,
} from "@/lib/workflow-schema/schema";
import { createEmptyWorkflowDefinition } from "@/lib/workflow-schema/factory";
import { getTriggerConfig } from "@/lib/workflow-schema/nodes";
import { computeNextRunAt } from "@/lib/workflow-engine/schedule";

/**
 * Authenticated (RLS-enforced) access to workflows — mirrors
 * lib/db/repositories/forms.ts. Workflows are workspace-scoped (not
 * form-scoped): a single workflow's trigger can reference multiple forms,
 * tracked in the `workflow_form_triggers` join table (0013) and mirrored in
 * the trigger node's `config.formIds` (the editor's source of truth). Runs
 * (workflow_runs/workflow_run_steps) are server-role-only and live in
 * workflow-runs.ts instead.
 */

export type WorkflowStatus = "enabled" | "paused";

export interface WorkflowSummary {
  id: string;
  workspaceId: string;
  name: string;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRecord extends WorkflowSummary {
  definition: WorkflowDefinition;
  schemaVersion: number;
  createdBy: string | null;
  /** Forms currently attached via the workflow_form_triggers join table. */
  triggerFormIds: string[];
}

const webhookSecretAlphabet = customAlphabet(
  "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ",
  32,
);
/**
 * Separate credential from webhookSecretAlphabet: the inbound token is
 * embedded in a public URL (and therefore visible in proxy/access logs),
 * while webhook_secret is the OUTBOUND HMAC signing key — the two must
 * never be interchangeable.
 */
const inboundTokenAlphabet = customAlphabet(
  "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ",
  32,
);

function mapRow(
  data: {
    id: string;
    workspace_id: string;
    name: string;
    status: string;
    definition: unknown;
    schema_version: number;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  },
  triggerFormIds: string[] = [],
): WorkflowRecord {
  return {
    id: data.id,
    workspaceId: data.workspace_id,
    name: data.name,
    status: data.status as WorkflowStatus,
    definition: data.definition as unknown as WorkflowDefinition,
    schemaVersion: data.schema_version,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    triggerFormIds,
  };
}

/** Extracts the trigger node's selected form IDs from a definition, deduplicated. */
function formIdsFromDefinition(definition: WorkflowDefinition): string[] {
  const trigger = definition.nodes.find((n) => n.type === "trigger");
  if (!trigger || trigger.type !== "trigger") return [];
  return [...new Set(trigger.config.formIds)];
}

/**
 * Syncs the workflow_form_triggers join table to match a given list of form
 * IDs — delete rows no longer present, insert rows newly present. Called by
 * every writer of a workflow's definition (createWorkflow,
 * saveWorkflowDefinition) so the join table never drifts from the trigger
 * node's `config.formIds` for long, and is safe to call redundantly (e.g.
 * as drift insurance before enabling a workflow).
 */
export async function syncWorkflowTriggerForms(
  workflowId: string,
  formIds: string[],
): Promise<void> {
  const supabase = await createUserClient();
  const desired = [...new Set(formIds)];

  const { data: existing, error: fetchError } = await supabase
    .from("workflow_form_triggers")
    .select("form_id")
    .eq("workflow_id", workflowId);
  if (fetchError) {
    throw new AppError("FORBIDDEN", "Trigger-Formulare konnten nicht synchronisiert werden.", {
      cause: fetchError,
    });
  }

  const existingIds = new Set((existing ?? []).map((r) => r.form_id));
  const desiredIds = new Set(desired);

  const toDelete = [...existingIds].filter((id) => !desiredIds.has(id));
  const toInsert = desired.filter((id) => !existingIds.has(id));

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("workflow_form_triggers")
      .delete()
      .eq("workflow_id", workflowId)
      .in("form_id", toDelete);
    if (error) {
      throw new AppError("FORBIDDEN", "Trigger-Formulare konnten nicht synchronisiert werden.", {
        cause: error,
      });
    }
  }

  if (toInsert.length > 0) {
    const { error } = await supabase
      .from("workflow_form_triggers")
      .insert(toInsert.map((formId) => ({ workflow_id: workflowId, form_id: formId })));
    if (error) {
      throw new AppError("FORBIDDEN", "Trigger-Formulare konnten nicht synchronisiert werden.", {
        cause: error,
      });
    }
  }
}

export async function listWorkflows(workspaceId: string): Promise<WorkflowRecord[]> {
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("workflows")
    .select("*, workflow_form_triggers(form_id)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new AppError("INTERNAL_ERROR", "Workflows konnten nicht geladen werden.", {
      cause: error,
    });
  }

  return (data ?? []).map((row) => {
    const { workflow_form_triggers, ...workflow } = row;
    return mapRow(
      workflow,
      (workflow_form_triggers as { form_id: string }[] | null)?.map((t) => t.form_id) ?? [],
    );
  });
}

export async function getWorkflow(workflowId: string): Promise<WorkflowRecord | null> {
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("workflows")
    .select("*, workflow_form_triggers(form_id)")
    .eq("id", workflowId)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL_ERROR", "Workflow konnte nicht geladen werden.", { cause: error });
  }
  if (!data) return null;

  const { workflow_form_triggers, ...workflow } = data;
  return mapRow(
    workflow,
    (workflow_form_triggers as { form_id: string }[] | null)?.map((t) => t.form_id) ?? [],
  );
}

export async function createWorkflow(params: {
  workspaceId: string;
  name: string;
  userId: string;
  definition?: WorkflowDefinition;
  status?: WorkflowStatus;
}): Promise<WorkflowRecord> {
  const supabase = await createUserClient();
  const definition = params.definition ?? createEmptyWorkflowDefinition();

  const nextRunAt = computeNextRunAt(getTriggerConfig(definition.nodes), new Date());

  const { data, error } = await supabase
    .from("workflows")
    .insert({
      workspace_id: params.workspaceId,
      name: params.name,
      status: params.status ?? "paused",
      definition: definition as never,
      schema_version: CURRENT_WORKFLOW_SCHEMA_VERSION,
      webhook_secret: webhookSecretAlphabet(),
      inbound_token: inboundTokenAlphabet(),
      next_run_at: nextRunAt ? nextRunAt.toISOString() : null,
      created_by: params.userId,
    })
    .select("*")
    .single();

  if (error) {
    throw new AppError("FORBIDDEN", "Workflow konnte nicht erstellt werden.", { cause: error });
  }

  const triggerFormIds = formIdsFromDefinition(definition);
  if (triggerFormIds.length > 0) {
    await syncWorkflowTriggerForms(data.id, triggerFormIds);
  }

  return mapRow(data, triggerFormIds);
}

/**
 * Saves the definition, re-syncs workflow_form_triggers from its trigger
 * node's formIds, and recomputes next_run_at from the (possibly changed)
 * schedule — kept fresh on every save so an already-enabled workflow whose
 * schedule was just edited doesn't keep firing on the old slot.
 */
export async function saveWorkflowDefinition(
  workflowId: string,
  definition: WorkflowDefinition,
): Promise<void> {
  const supabase = await createUserClient();
  const nextRunAt = computeNextRunAt(getTriggerConfig(definition.nodes), new Date());

  const { error } = await supabase
    .from("workflows")
    .update({
      definition: definition as never,
      next_run_at: nextRunAt ? nextRunAt.toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", workflowId);

  if (error) {
    throw new AppError("FORBIDDEN", "Workflow konnte nicht gespeichert werden.", { cause: error });
  }

  await syncWorkflowTriggerForms(workflowId, formIdsFromDefinition(definition));
}

export async function renameWorkflow(workflowId: string, name: string): Promise<void> {
  const supabase = await createUserClient();
  const { error } = await supabase.from("workflows").update({ name }).eq("id", workflowId);
  if (error) {
    throw new AppError("FORBIDDEN", "Workflow konnte nicht umbenannt werden.", { cause: error });
  }
}

/**
 * `definition` should be passed when `status === "enabled"` so next_run_at
 * is recomputed from "now" — the value persisted at the last save may
 * already be in the past if the workflow was paused for a while.
 */
export async function setWorkflowStatus(
  workflowId: string,
  status: WorkflowStatus,
  definition?: WorkflowDefinition,
): Promise<void> {
  const supabase = await createUserClient();
  const patch: { status: WorkflowStatus; next_run_at?: string | null } = { status };
  if (status === "enabled" && definition) {
    const nextRunAt = computeNextRunAt(getTriggerConfig(definition.nodes), new Date());
    patch.next_run_at = nextRunAt ? nextRunAt.toISOString() : null;
  }
  const { error } = await supabase.from("workflows").update(patch).eq("id", workflowId);
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

/** The inbound-webhook token for this workflow's public trigger URL (distinct from webhook_secret — see inboundTokenAlphabet). */
export async function getWorkflowInboundToken(workflowId: string): Promise<string | null> {
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("workflows")
    .select("inbound_token")
    .eq("id", workflowId)
    .maybeSingle();
  if (error) {
    throw new AppError("INTERNAL_ERROR", "Webhook-Token konnte nicht geladen werden.", {
      cause: error,
    });
  }
  return data?.inbound_token ?? null;
}
