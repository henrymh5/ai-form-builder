"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/db/repositories/profile";
import {
  createWorkflow,
  deleteWorkflow,
  renameWorkflow,
  saveWorkflowDefinition,
  setWorkflowStatus,
  type WorkflowStatus,
} from "@/lib/db/repositories/workflows";
import { workflowDefinitionSchema, type WorkflowDefinition } from "@/lib/workflow-schema/schema";
import { validateWorkflowDefinition, isWorkflowValid } from "@/lib/workflow-schema/validate";
import { listFormOptionsWithDefinitions } from "@/lib/db/repositories/forms";

const createSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(200),
});

/** Creates a new workflow (empty, paused) and redirects into its editor. */
export async function createWorkflowAction(formData: FormData): Promise<void> {
  const parsed = createSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    name: formData.get("name"),
  });
  if (!parsed.success) return;

  const user = await getCurrentUser();
  if (!user) return;

  const workflow = await createWorkflow({
    workspaceId: parsed.data.workspaceId,
    name: parsed.data.name,
    userId: user.id,
  });

  revalidatePath("/workflows");
  redirect(`/workflows/${workflow.id}`);
}

const workflowIdSchema = z.object({ workflowId: z.string().uuid() });

export async function deleteWorkflowAction(formData: FormData): Promise<void> {
  const parsed = workflowIdSchema.safeParse({ workflowId: formData.get("workflowId") });
  if (!parsed.success) return;
  await deleteWorkflow(parsed.data.workflowId);
  revalidatePath("/workflows");
}

const renameSchema = z.object({
  workflowId: z.string().uuid(),
  name: z.string().min(1).max(200),
});

export async function renameWorkflowAction(formData: FormData): Promise<void> {
  const parsed = renameSchema.safeParse({
    workflowId: formData.get("workflowId"),
    name: formData.get("name"),
  });
  if (!parsed.success) return;
  await renameWorkflow(parsed.data.workflowId, parsed.data.name);
  revalidatePath("/workflows");
}

export interface ToggleWorkflowResult {
  status: WorkflowStatus;
  error?: string;
}

/**
 * Toggles enabled/paused. Enabling is gated on validation passing against
 * ALL of the trigger's currently-selected forms (a broken workflow must
 * never go live and start sending real emails/webhooks). Also re-syncs
 * workflow_form_triggers as drift insurance, since enabling is the moment
 * the join table's accuracy actually matters for the enqueue path.
 */
export async function toggleWorkflowStatusAction(
  workflowId: string,
  workspaceId: string,
  nextStatus: WorkflowStatus,
  definition: unknown,
): Promise<ToggleWorkflowResult> {
  let parsedDefinition: WorkflowDefinition | undefined;
  if (nextStatus === "enabled") {
    const parsed = workflowDefinitionSchema.safeParse(definition);
    if (!parsed.success) {
      return { status: "paused", error: "Die Workflow-Definition ist ungültig." };
    }
    parsedDefinition = parsed.data;
    const forms = await listFormOptionsWithDefinitions(workspaceId);
    const validation = validateWorkflowDefinition(parsedDefinition, forms);
    if (!isWorkflowValid(validation)) {
      return {
        status: "paused",
        error: validation.errors[0]?.message ?? "Der Workflow enthält Fehler.",
      };
    }
  }

  await setWorkflowStatus(workflowId, nextStatus, parsedDefinition);
  revalidatePath("/workflows");
  revalidatePath(`/workflows/${workflowId}`);
  return { status: nextStatus };
}

const saveSchema = z.object({
  workflowId: z.string().uuid(),
  definition: workflowDefinitionSchema,
});

export interface SaveWorkflowResult {
  ok: boolean;
  error?: string;
}

/** Explicit save (no autosave — see plan: a half-edited workflow could otherwise go live mid-edit). */
export async function saveWorkflowAction(params: {
  workflowId: string;
  definition: unknown;
}): Promise<SaveWorkflowResult> {
  const parsed = saveSchema.safeParse(params);
  if (!parsed.success) {
    return { ok: false, error: "Die Workflow-Definition ist ungültig." };
  }

  await saveWorkflowDefinition(parsed.data.workflowId, parsed.data.definition);
  revalidatePath("/workflows");
  revalidatePath(`/workflows/${parsed.data.workflowId}`);
  return { ok: true };
}
