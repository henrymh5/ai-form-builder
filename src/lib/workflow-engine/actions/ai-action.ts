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

/** "aiAction" node — summarize/classify/translate the response via Claude, appended as a note. */
export const runAiAction: ActionHandler = async (node, ctx) => {
  if (node.type !== "aiAction") throw new Error("Falscher Knotentyp für aiAction.");
  const { config } = node;

  if (ctx.dryRun) {
    return { output: { simulated: true, task: config.task } };
  }

  await checkRateLimit(WORKFLOW_AI_ACTION_RATE_LIMIT, ctx.workspaceId);

  const answersText = resolvePlaceholders("{{response:all}}", ctx);
  const result = await runWorkflowAiAction(
    {
      task: config.task,
      categories: config.categories,
      targetLanguage: config.targetLanguage,
      formTitle: ctx.form.metadata.title,
      answersText,
    },
    {
      userId: ctx.createdByUserId ?? "system",
      workspaceId: ctx.workspaceId,
      formId: ctx.formId,
    },
  );

  const label = TASK_LABEL[config.task];
  await appendResponseNoteForWorkflow(ctx.responseId, `[${label}] ${result.result}`);

  return { output: { task: config.task, result: result.result } };
};
