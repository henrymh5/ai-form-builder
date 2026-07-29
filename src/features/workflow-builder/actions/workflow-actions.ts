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
import { workflowDefinitionSchema } from "@/lib/workflow-schema/schema";
import { validateWorkflowDefinition, isWorkflowValid } from "@/lib/workflow-schema/validate";
import { getForm } from "@/lib/db/repositories/forms";

const createSchema = z.object({
  formId: z.string().uuid(),
  name: z.string().min(1).max(200),
});

/** Creates a new workflow (empty, paused) and redirects into its editor. */
export async function createWorkflowAction(formData: FormData): Promise<void> {
  const parsed = createSchema.safeParse({
    formId: formData.get("formId"),
    name: formData.get("name"),
  });
  if (!parsed.success) return;

  const user = await getCurrentUser();
  if (!user) return;

  const workflow = await createWorkflow({
    formId: parsed.data.formId,
    name: parsed.data.name,
    userId: user.id,
  });

  revalidatePath(`/forms/${parsed.data.formId}/workflows`);
  redirect(`/forms/${parsed.data.formId}/workflows/${workflow.id}`);
}

const workflowIdSchema = z.object({ workflowId: z.string().uuid(), formId: z.string().uuid() });

export async function deleteWorkflowAction(formData: FormData): Promise<void> {
  const parsed = workflowIdSchema.safeParse({
    workflowId: formData.get("workflowId"),
    formId: formData.get("formId"),
  });
  if (!parsed.success) return;
  await deleteWorkflow(parsed.data.workflowId);
  revalidatePath(`/forms/${parsed.data.formId}/workflows`);
}

const renameSchema = z.object({
  workflowId: z.string().uuid(),
  formId: z.string().uuid(),
  name: z.string().min(1).max(200),
});

export async function renameWorkflowAction(formData: FormData): Promise<void> {
  const parsed = renameSchema.safeParse({
    workflowId: formData.get("workflowId"),
    formId: formData.get("formId"),
    name: formData.get("name"),
  });
  if (!parsed.success) return;
  await renameWorkflow(parsed.data.workflowId, parsed.data.name);
  revalidatePath(`/forms/${parsed.data.formId}/workflows`);
}

export interface ToggleWorkflowResult {
  status: WorkflowStatus;
  error?: string;
}

/**
 * Toggles enabled/paused. Enabling is gated on validation passing against
 * the current form definition — a broken workflow must never go live and
 * start sending real emails/webhooks (plan: "Aktivieren nur nach
 * erfolgreicher Servervalidierung").
 */
export async function toggleWorkflowStatusAction(
  workflowId: string,
  formId: string,
  nextStatus: WorkflowStatus,
  definition: unknown,
): Promise<ToggleWorkflowResult> {
  if (nextStatus === "enabled") {
    const parsedDefinition = workflowDefinitionSchema.safeParse(definition);
    if (!parsedDefinition.success) {
      return { status: "paused", error: "Die Workflow-Definition ist ungültig." };
    }
    const form = await getForm(formId);
    const validation = validateWorkflowDefinition(parsedDefinition.data, form?.draftDefinition);
    if (!isWorkflowValid(validation)) {
      return {
        status: "paused",
        error: validation.errors[0]?.message ?? "Der Workflow enthält Fehler.",
      };
    }
  }

  await setWorkflowStatus(workflowId, nextStatus);
  revalidatePath(`/forms/${formId}/workflows`);
  revalidatePath(`/forms/${formId}/workflows/${workflowId}`);
  return { status: nextStatus };
}

const saveSchema = z.object({
  workflowId: z.string().uuid(),
  formId: z.string().uuid(),
  definition: workflowDefinitionSchema,
});

export interface SaveWorkflowResult {
  ok: boolean;
  error?: string;
}

/** Explicit save (no autosave — see plan: a half-edited workflow could otherwise go live mid-edit). */
export async function saveWorkflowAction(params: {
  workflowId: string;
  formId: string;
  definition: unknown;
}): Promise<SaveWorkflowResult> {
  const parsed = saveSchema.safeParse(params);
  if (!parsed.success) {
    return { ok: false, error: "Die Workflow-Definition ist ungültig." };
  }

  await saveWorkflowDefinition(parsed.data.workflowId, parsed.data.definition);
  revalidatePath(`/forms/${parsed.data.formId}/workflows`);
  revalidatePath(`/forms/${parsed.data.formId}/workflows/${parsed.data.workflowId}`);
  return { ok: true };
}
