import "server-only";
import type { AnswerMap } from "@/lib/logic-engine/evaluate";
import {
  claimWorkflowRun,
  enqueueWorkflowRun,
  finishWorkflowRun,
  finishWorkflowRunStep,
  getFormContextForRun,
  getResponseAnswersForRun,
  getUserEmailById,
  getWorkflowRun,
  getWorkflowRunMeta,
  listEnabledWorkflowsForForm,
  startWorkflowRunStep,
} from "@/lib/db/repositories/workflow-runs";
import { defaultActionRegistry } from "./actions/registry";
import type { RunContext } from "./context";
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
 * Enqueues one run per enabled workflow for this form, synchronously — so a
 * run exists (retryable if `queued`) even if the process dies before
 * `after()` gets to execute it. Never throws: a broken enqueue must not fail
 * the visitor's submission.
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

async function assembleContext(runId: string, dryRun: boolean): Promise<RunContext | null> {
  const run = await getWorkflowRun(runId);
  if (!run) return null;

  const responseData = await getResponseAnswersForRun(run.responseId);
  if (!responseData) return null;

  const formContext = await getFormContextForRun(run.formId, responseData.formVersionId);
  if (!formContext) return null;

  const workflowMeta = await getWorkflowRunMeta(run.workflowId);
  const creatorEmail = workflowMeta?.createdBy
    ? await getUserEmailById(workflowMeta.createdBy)
    : null;

  return {
    runId,
    workflowId: run.workflowId,
    formId: run.formId,
    responseId: run.responseId,
    isTest: run.isTest,
    dryRun,
    form: formContext.definition,
    answers: buildAnswerMap(responseData.answers),
    rawAnswers: responseData.answers,
    response: { id: run.responseId, submittedAt: responseData.submittedAt },
    workflow: {
      id: run.workflowId,
      name: workflowMeta?.name ?? "",
      webhookSecret: workflowMeta?.webhookSecret ?? null,
    },
    createdByUserId: workflowMeta?.createdBy ?? null,
    creatorEmail,
    workspaceId: formContext.workspaceId,
  };
}

/**
 * Executes one run: claims it (no-op if another process already claimed it),
 * assembles the run context, walks the graph persisting each step, and
 * finalizes the run's status. Safe to call multiple times for the same run
 * ID — only the first caller to win the claim actually executes.
 */
export async function executeWorkflowRun(runId: string, options: { dryRun?: boolean } = {}): Promise<void> {
  const claimed = await claimWorkflowRun(runId);
  if (!claimed) return;

  const ctx = await assembleContext(runId, options.dryRun ?? false);
  if (!ctx) {
    await finishWorkflowRun(runId, {
      status: "failed",
      errorCode: "CONTEXT_UNAVAILABLE",
      errorMessage: "Formular oder Antwort für diesen Lauf konnte nicht geladen werden.",
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
