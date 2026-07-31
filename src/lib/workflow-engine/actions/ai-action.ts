import { runWorkflowAiAction } from "@/lib/ai/functions/workflow-ai-action";
import { appendResponseNoteForWorkflow } from "@/lib/db/repositories/workflow-runs";
import { checkRateLimit, WORKFLOW_AI_ACTION_RATE_LIMIT } from "@/lib/db/repositories/rate-limit";
import type { ActionHandler } from "../context";
import { resolvePlaceholders } from "../placeholders";

const TASK_LABEL: Record<"summarize" | "classify" | "translate", string> = {
  summarize: "KI-Zusammenfassung",
  classify: "KI-Einordnung",
  translate: "KI-Übersetzung",
};

/**
 * "aiAction" node — summarize/classify/translate via Claude.
 *
 * classify/translate need a single response and are only reachable under a
 * response_submitted trigger (validate.ts's AI_TASK_UNSUPPORTED_FOR_TRIGGER
 * blocks saving otherwise) — the `ctx.responseId` check below is
 * defense-in-depth for an already-enqueued snapshot that predates that rule.
 * summarize works under any trigger: it summarizes the single response or,
 * in digest mode, {{digest:list}}. The result is always stored in
 * `ctx.aiResult` for a later {{ai:result}} placeholder; a note is appended
 * only when there is a single response to attach it to.
 */
export const runAiAction: ActionHandler = async (node, ctx) => {
  if (node.type !== "aiAction") throw new Error("Falscher Knotentyp für aiAction.");
  const { config } = node;

  if (ctx.dryRun) {
    return { output: { simulated: true, task: config.task } };
  }

  if (config.task !== "summarize" && !ctx.responseId) {
    throw new Error(
      "Diese KI-Aufgabe ist nur bei einer einzelnen Antwort verfügbar (nicht bei Zeitplan-/Webhook-/manuellen Läufen).",
    );
  }

  await checkRateLimit(WORKFLOW_AI_ACTION_RATE_LIMIT, ctx.workspaceId);

  const answersText = resolvePlaceholders(
    ctx.responseId ? "{{response:all}}" : "{{digest:list}}",
    ctx,
  );
  const formTitle = ctx.form?.metadata.title ?? ctx.workflow.name;

  const result = await runWorkflowAiAction(
    {
      task: config.task,
      categories: config.categories,
      targetLanguage: config.targetLanguage,
      formTitle,
      answersText,
      isDigest: !ctx.responseId,
    },
    {
      userId: ctx.createdByUserId ?? "system",
      workspaceId: ctx.workspaceId,
      formId: ctx.formId,
    },
  );

  ctx.aiResult = result.result;

  if (ctx.responseId) {
    const label = TASK_LABEL[config.task];
    await appendResponseNoteForWorkflow(ctx.responseId, `[${label}] ${result.result}`);
  }

  return { output: { task: config.task, result: result.result } };
};
