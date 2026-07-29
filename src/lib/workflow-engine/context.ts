import type { AnswerMap } from "@/lib/logic-engine/evaluate";
import type { FormDefinition } from "@/lib/form-schema/schema";
import type { WorkflowDefinition, WorkflowNode } from "@/lib/workflow-schema/schema";

/**
 * Everything a workflow run needs to evaluate conditions and execute actions
 * — assembled once by run.ts (DB-backed) and passed down into the pure
 * interpreter, so the interpreter itself never touches the database.
 */
export interface RunContext {
  runId: string;
  workflowId: string;
  formId: string;
  responseId: string;
  isTest: boolean;
  /** True for a dry-run test invoked from the editor — actions must simulate instead of executing. */
  dryRun: boolean;
  form: FormDefinition;
  answers: AnswerMap;
  /** Raw field-id -> value/type answers, for actions that need more than the AnswerMap gives (e.g. webhook payload). */
  rawAnswers: { fieldId: string; fieldType: string; value: unknown }[];
  response: {
    id: string;
    submittedAt: string;
  };
  workflow: {
    id: string;
    name: string;
    webhookSecret: string | null;
  };
  createdByUserId: string | null;
  /** Resolved once by run.ts (service-role lookup) for the email node's "creator" recipient. */
  creatorEmail: string | null;
  workspaceId: string;
}

export interface ActionResult {
  output?: unknown;
}

export type ActionHandler = (node: WorkflowNode, ctx: RunContext) => Promise<ActionResult>;

export type ActionRegistry = Partial<Record<WorkflowNode["type"], ActionHandler>>;

export interface WorkflowStepEvent {
  nodeId: string;
  nodeType: WorkflowNode["type"];
  status: "succeeded" | "failed" | "skipped";
  input?: unknown;
  output?: unknown;
  errorMessage?: string;
}

export interface InterpreterResult {
  status: "succeeded" | "failed";
  errorCode?: string;
  errorMessage?: string;
  steps: WorkflowStepEvent[];
}

export type { WorkflowDefinition };
