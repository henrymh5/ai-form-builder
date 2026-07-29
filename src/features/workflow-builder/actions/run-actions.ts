"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  enqueueWorkflowRun,
  getWorkflowRun,
} from "@/lib/db/repositories/workflow-runs";
import { executeWorkflowRun } from "@/lib/workflow-engine/run";
import { workflowDefinitionSchema } from "@/lib/workflow-schema/schema";

const retrySchema = z.object({
  runId: z.string().uuid(),
  workflowId: z.string().uuid(),
  formId: z.string().uuid(),
});

const MAX_ATTEMPTS = 3;

export interface RetryRunResult {
  ok: boolean;
  error?: string;
}

/** Retries a failed/stuck run — inserts a new attempt with the same snapshot and executes it. */
export async function retryRunAction(formData: FormData): Promise<RetryRunResult> {
  const parsed = retrySchema.safeParse({
    runId: formData.get("runId"),
    workflowId: formData.get("workflowId"),
    formId: formData.get("formId"),
  });
  if (!parsed.success) return { ok: false, error: "Ungültige Anfrage." };

  const run = await getWorkflowRun(parsed.data.runId);
  if (!run) return { ok: false, error: "Lauf nicht gefunden." };
  if (run.status !== "failed" && run.status !== "queued" && run.status !== "running") {
    return { ok: false, error: "Nur fehlgeschlagene oder hängende Läufe können erneut gestartet werden." };
  }
  if (run.attempt >= MAX_ATTEMPTS) {
    return { ok: false, error: "Maximale Anzahl an Versuchen erreicht." };
  }

  const newRunId = await enqueueWorkflowRun({
    workflowId: run.workflowId,
    formId: run.formId,
    responseId: run.responseId,
    definition: run.definitionSnapshot,
    attempt: run.attempt + 1,
  });
  if (!newRunId) return { ok: false, error: "Lauf konnte nicht erneut gestartet werden." };

  await executeWorkflowRun(newRunId);

  revalidatePath(`/forms/${parsed.data.formId}/workflows/${parsed.data.workflowId}/runs`);
  return { ok: true };
}

const testRunSchema = z.object({
  workflowId: z.string().uuid(),
  formId: z.string().uuid(),
  responseId: z.string().uuid(),
  definition: workflowDefinitionSchema,
});

export interface TestRunResult {
  ok: boolean;
  runId?: string;
  error?: string;
}

/**
 * Starts a dry-run test using an existing response's answers — actions are
 * simulated (see RunContext.dryRun in the engine), never sent for real.
 * Awaited directly rather than via after(): the user is watching and wants
 * the result immediately, unlike a real visitor's submission.
 */
export async function startTestRunAction(params: {
  workflowId: string;
  formId: string;
  responseId: string;
  definition: unknown;
}): Promise<TestRunResult> {
  const parsed = testRunSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Ungültige Anfrage." };

  const runId = await enqueueWorkflowRun({
    workflowId: parsed.data.workflowId,
    formId: parsed.data.formId,
    responseId: parsed.data.responseId,
    definition: parsed.data.definition,
    isTest: true,
  });
  if (!runId) return { ok: false, error: "Testlauf konnte nicht gestartet werden." };

  await executeWorkflowRun(runId, { dryRun: true });

  revalidatePath(`/forms/${parsed.data.formId}/workflows/${parsed.data.workflowId}/runs`);
  return { ok: true, runId };
}
