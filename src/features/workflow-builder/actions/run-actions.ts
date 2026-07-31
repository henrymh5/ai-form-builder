"use server";

import { revalidatePath } from "next/cache";
import { customAlphabet } from "nanoid";
import { z } from "zod";
import { getCurrentUser } from "@/lib/db/repositories/profile";
import {
  advanceDigestWindow,
  enqueueWorkflowRun,
  getResponseFormId,
  getWorkflowRun,
  getWorkflowScheduleMeta,
} from "@/lib/db/repositories/workflow-runs";
import { getWorkflow as getWorkflowAuthenticated } from "@/lib/db/repositories/workflows";
import { executeWorkflowRun } from "@/lib/workflow-engine/run";
import { getTriggerConfig } from "@/lib/workflow-schema/nodes";
import { workflowDefinitionSchema } from "@/lib/workflow-schema/schema";

const runIdAlphabet = customAlphabet(
  "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ",
  16,
);

const retrySchema = z.object({
  runId: z.string().uuid(),
});

const MAX_ATTEMPTS = 3;

export interface RetryRunResult {
  ok: boolean;
  error?: string;
}

/** Retries a failed/stuck run — inserts a new attempt with the same snapshot and executes it. */
export async function retryRunAction(formData: FormData): Promise<RetryRunResult> {
  const parsed = retrySchema.safeParse({ runId: formData.get("runId") });
  if (!parsed.success) return { ok: false, error: "Ungültige Anfrage." };

  const run = await getWorkflowRun(parsed.data.runId);
  if (!run) return { ok: false, error: "Lauf nicht gefunden." };
  if (run.status !== "failed" && run.status !== "queued" && run.status !== "running") {
    return {
      ok: false,
      error: "Nur fehlgeschlagene oder hängende Läufe können erneut gestartet werden.",
    };
  }
  if (run.attempt >= MAX_ATTEMPTS) {
    return { ok: false, error: "Maximale Anzahl an Versuchen erreicht." };
  }

  const newRunId = await enqueueWorkflowRun({
    workflowId: run.workflowId,
    formId: run.formId,
    responseId: run.responseId,
    definition: run.definitionSnapshot,
    triggerType: run.triggerType,
    dedupeKey: run.dedupeKey,
    triggerContext: run.triggerContext,
    attempt: run.attempt + 1,
  });
  if (!newRunId) return { ok: false, error: "Lauf konnte nicht erneut gestartet werden." };

  await executeWorkflowRun(newRunId);

  revalidatePath(`/workflows/${run.workflowId}/runs`);
  return { ok: true };
}

const testRunSchema = z.object({
  workflowId: z.string().uuid(),
  responseId: z.string().uuid().optional(),
  definition: workflowDefinitionSchema,
  /** Raw JSON text for a simulated inbound-webhook body — only used for webhook_inbound triggers. */
  payload: z.string().max(65_536).optional(),
});

export interface TestRunResult {
  ok: boolean;
  runId?: string;
  error?: string;
}

const DIGEST_TEST_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Starts a dry-run test — actions are simulated (see RunContext.dryRun in
 * the engine), never sent for real, and the workflow's digest window
 * (last_digest_at) is never advanced. Behavior branches on the SAVED
 * workflow's trigger type (not the possibly-unsaved `definition` passed
 * in, since the dialog is disabled while dirty):
 *
 * - response_submitted: simulates against a chosen, already-submitted
 *   response; `formId` is resolved server-side, never trusted from the client.
 * - everything else: simulates a digest run over the last 7 days (capped
 *   by the workflow's actual last_digest_at if more recent), optionally
 *   with a sample inbound-webhook payload.
 *
 * Awaited directly rather than via after(): the user is watching and wants
 * the result immediately, unlike a real visitor's submission.
 */
export async function startTestRunAction(params: {
  workflowId: string;
  responseId?: string;
  definition: unknown;
  payload?: string;
}): Promise<TestRunResult> {
  const parsed = testRunSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Ungültige Anfrage." };

  const triggerConfig = getTriggerConfig(parsed.data.definition.nodes);
  if (!triggerConfig) return { ok: false, error: "Kein Trigger konfiguriert." };

  const dedupeKey = `test:${runIdAlphabet()}`;

  if (triggerConfig.event === "response_submitted") {
    if (!parsed.data.responseId) {
      return { ok: false, error: "Bitte eine Antwort auswählen." };
    }
    const formId = await getResponseFormId(parsed.data.responseId);
    if (!formId) return { ok: false, error: "Antwort nicht gefunden." };

    const runId = await enqueueWorkflowRun({
      workflowId: parsed.data.workflowId,
      formId,
      responseId: parsed.data.responseId,
      definition: parsed.data.definition,
      triggerType: "response_submitted",
      dedupeKey,
      isTest: true,
    });
    if (!runId) return { ok: false, error: "Testlauf konnte nicht gestartet werden." };

    await executeWorkflowRun(runId, { dryRun: true });
    revalidatePath(`/workflows/${parsed.data.workflowId}/runs`);
    return { ok: true, runId };
  }

  let payload: unknown = undefined;
  if (triggerConfig.event === "webhook_inbound" && parsed.data.payload) {
    try {
      payload = JSON.parse(parsed.data.payload);
    } catch {
      return { ok: false, error: "Das Beispiel-Payload ist kein gültiges JSON." };
    }
  }

  const meta = await getWorkflowScheduleMeta(parsed.data.workflowId);
  if (!meta) return { ok: false, error: "Workflow nicht gefunden." };

  const now = new Date();
  const cappedStart = new Date(now.getTime() - DIGEST_TEST_WINDOW_MS);
  const lastDigestAt = meta.lastDigestAt ? new Date(meta.lastDigestAt) : null;
  const windowStart = lastDigestAt && lastDigestAt > cappedStart ? lastDigestAt : cappedStart;

  const runId = await enqueueWorkflowRun({
    workflowId: parsed.data.workflowId,
    formId: null,
    responseId: null,
    definition: parsed.data.definition,
    triggerType: triggerConfig.event,
    dedupeKey,
    triggerContext: {
      windowStart: windowStart.toISOString(),
      windowEnd: now.toISOString(),
      payload,
    },
    isTest: true,
  });
  if (!runId) return { ok: false, error: "Testlauf konnte nicht gestartet werden." };

  await executeWorkflowRun(runId, { dryRun: true });
  revalidatePath(`/workflows/${parsed.data.workflowId}/runs`);
  return { ok: true, runId };
}

const manualSchema = z.object({ workflowId: z.string().uuid() });

export interface ManualRunResult {
  ok: boolean;
  runId?: string;
  error?: string;
}

/**
 * Runs a `manual`-trigger workflow for real (no dry-run) — requires the
 * workflow to be enabled (same real-side-effect gate as every other trigger
 * type; experimenting on a paused workflow is what the Testlauf dialog is
 * for). Advances last_digest_at like any other digest-based real run.
 */
export async function runManualWorkflowAction(
  params: z.infer<typeof manualSchema>,
): Promise<ManualRunResult> {
  const parsed = manualSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Ungültige Anfrage." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  // Authenticated (RLS-scoped) load — this doubles as the authorization check.
  const workflow = await getWorkflowAuthenticated(parsed.data.workflowId);
  if (!workflow) return { ok: false, error: "Workflow nicht gefunden." };
  if (workflow.status !== "enabled") {
    return { ok: false, error: "Der Workflow muss aktiviert sein, um ihn manuell zu starten." };
  }
  const triggerConfig = getTriggerConfig(workflow.definition.nodes);
  if (triggerConfig?.event !== "manual") {
    return { ok: false, error: "Dieser Workflow hat keinen manuellen Trigger." };
  }

  const meta = await getWorkflowScheduleMeta(parsed.data.workflowId);
  const now = new Date();
  const windowStart = meta?.lastDigestAt ?? meta?.createdAt ?? null;

  await advanceDigestWindow(parsed.data.workflowId, now);

  const runId = await enqueueWorkflowRun({
    workflowId: parsed.data.workflowId,
    formId: null,
    responseId: null,
    definition: workflow.definition,
    triggerType: "manual",
    dedupeKey: `manual:${runIdAlphabet()}`,
    triggerContext: { windowStart, windowEnd: now.toISOString() },
  });
  if (!runId) return { ok: false, error: "Lauf konnte nicht gestartet werden." };

  await executeWorkflowRun(runId);

  revalidatePath("/workflows");
  revalidatePath(`/workflows/${parsed.data.workflowId}`);
  revalidatePath(`/workflows/${parsed.data.workflowId}/runs`);
  return { ok: true, runId };
}
