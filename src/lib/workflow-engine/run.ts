import "server-only";
import type { AnswerMap } from "@/lib/logic-engine/evaluate";
import {
  claimWorkflowRun,
  enqueueWorkflowRun,
  finishWorkflowRun,
  finishWorkflowRunStep,
  getDigestResponses,
  getFormContextForRun,
  getResponseAnswersForRun,
  getUserEmailById,
  getWorkflowRun,
  getWorkflowRunMeta,
  listEnabledWorkflowsForForm,
  startWorkflowRunStep,
  type DigestResponse as RepoDigestResponse,
} from "@/lib/db/repositories/workflow-runs";
import { defaultActionRegistry } from "./actions/registry";
import type { DigestResponse, RunContext } from "./context";
import { runWorkflowGraph } from "./interpreter";

/**
 * Orchestrates one workflow run end-to-end: claim -> load context -> run the
 * pure interpreter with DB-backed step persistence -> finalize status. The
 * only DB access here goes through workflow-runs.ts repository functions
 * (ESLint fences the service-role client itself to lib/db).
 */

export interface EnqueueParams {
  formId: string;
  responseId: string;
}

/**
 * Enqueues one run per enabled response_submitted workflow for this form,
 * synchronously — so a run exists (retryable if `queued`) even if the
 * process dies before `after()` gets to execute it. Never throws: a broken
 * enqueue must not fail the visitor's submission.
 *
 * listEnabledWorkflowsForForm already filters out schedule/webhook/manual
 * workflows (their formIds are a digest scope, not a submission trigger).
 */
export async function enqueueWorkflowRuns(params: EnqueueParams): Promise<string[]> {
  try {
    const workflows = await listEnabledWorkflowsForForm(params.formId);
    if (workflows.length === 0) return [];

    const runIds: string[] = [];
    for (const workflow of workflows) {
      const runId = await enqueueWorkflowRun({
        workflowId: workflow.id,
        formId: params.formId,
        responseId: params.responseId,
        definition: workflow.definition,
        triggerType: "response_submitted",
        dedupeKey: `response:${params.responseId}`,
      });
      if (runId) runIds.push(runId);
    }
    return runIds;
  } catch {
    return [];
  }
}

function buildAnswerMap(answers: { fieldId: string; value: unknown }[]): AnswerMap {
  const map: AnswerMap = {};
  for (const answer of answers) {
    map[answer.fieldId] = answer.value as AnswerMap[string];
  }
  return map;
}

function toDigestResponse(r: RepoDigestResponse): DigestResponse {
  return {
    responseId: r.responseId,
    formId: r.formId,
    formTitle: r.formTitle,
    submittedAt: r.submittedAt,
    answers: r.answers,
  };
}

async function assembleContext(runId: string, dryRun: boolean): Promise<RunContext | null> {
  const run = await getWorkflowRun(runId);
  if (!run) return null;

  const workflowMeta = await getWorkflowRunMeta(run.workflowId);
  if (!workflowMeta) return null;
  const creatorEmail = workflowMeta.createdBy
    ? await getUserEmailById(workflowMeta.createdBy)
    : null;

  const base = {
    runId,
    workflowId: run.workflowId,
    triggerType: run.triggerType,
    isTest: run.isTest,
    dryRun,
    workflow: {
      id: run.workflowId,
      name: workflowMeta.name,
      webhookSecret: workflowMeta.webhookSecret,
    },
    createdByUserId: workflowMeta.createdBy,
    creatorEmail,
  };

  if (run.triggerType === "response_submitted") {
    if (!run.responseId || !run.formId) return null;

    const responseData = await getResponseAnswersForRun(run.responseId);
    if (!responseData) return null;

    const formContext = await getFormContextForRun(run.formId, responseData.formVersionId);
    if (!formContext) return null;

    return {
      ...base,
      formId: run.formId,
      responseId: run.responseId,
      form: formContext.definition,
      answers: buildAnswerMap(responseData.answers),
      rawAnswers: responseData.answers,
      response: { id: run.responseId, submittedAt: responseData.submittedAt },
      digest: null,
      webhookPayload: null,
      workspaceId: formContext.workspaceId,
    };
  }

  // Digest-based trigger (schedule / scheduled_once / webhook_inbound / manual):
  // the window is frozen in trigger_context at enqueue time, so a retry
  // re-reads the exact same window rather than drifting forward.
  const windowStart = run.triggerContext?.windowStart ?? null;
  const windowEnd = run.triggerContext?.windowEnd ?? new Date().toISOString();
  const definitionTrigger = run.definitionSnapshot.nodes.find((n) => n.type === "trigger");
  const formIds =
    definitionTrigger?.type === "trigger" ? definitionTrigger.config.formIds : [];

  const digestResult = await getDigestResponses(formIds, windowStart, windowEnd);

  return {
    ...base,
    formId: null,
    responseId: null,
    form: null,
    answers: {},
    rawAnswers: [],
    response: null,
    digest: {
      responses: digestResult.responses.map(toDigestResponse),
      windowStart,
      windowEnd,
      truncated: digestResult.truncated,
    },
    webhookPayload: run.triggerContext?.payload ?? null,
    workspaceId: workflowMeta.workspaceId,
  };
}

/**
 * Executes one run: claims it (no-op if another process already claimed it),
 * assembles the run context, walks the graph persisting each step, and
 * finalizes the run's status. Safe to call multiple times for the same run
 * ID — only the first caller to win the claim actually executes.
 */
export async function executeWorkflowRun(
  runId: string,
  options: { dryRun?: boolean } = {},
): Promise<void> {
  const claimed = await claimWorkflowRun(runId);
  if (!claimed) return;

  const ctx = await assembleContext(runId, options.dryRun ?? false);
  if (!ctx) {
    await finishWorkflowRun(runId, {
      status: "failed",
      errorCode: "CONTEXT_UNAVAILABLE",
      errorMessage: "Kontext für diesen Lauf konnte nicht geladen werden.",
    });
    return;
  }

  const run = await getWorkflowRun(runId);
  const definition = run?.definitionSnapshot;
  if (!definition) {
    await finishWorkflowRun(runId, {
      status: "failed",
      errorCode: "CONTEXT_UNAVAILABLE",
      errorMessage: "Workflow-Definition für diesen Lauf konnte nicht geladen werden.",
    });
    return;
  }

  const result = await runWorkflowGraph({
    nodes: definition.nodes,
    edges: definition.edges,
    ctx,
    registry: defaultActionRegistry,
    onStep: async (event) => {
      const stepId = await startWorkflowRunStep({
        runId,
        nodeId: event.nodeId,
        nodeType: event.nodeType,
      });
      await finishWorkflowRunStep(stepId, {
        status: event.status,
        output: event.output,
        errorMessage: event.errorMessage,
      });
    },
  });

  if (result.status === "succeeded") {
    await finishWorkflowRun(runId, { status: "succeeded" });
  } else {
    await finishWorkflowRun(runId, {
      status: "failed",
      errorCode: result.errorCode ?? "UNKNOWN",
      errorMessage: result.errorMessage ?? "Unbekannter Fehler.",
    });
  }
}
