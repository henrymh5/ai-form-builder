import type { AnswerMap } from "@/lib/logic-engine/evaluate";
import type { FormDefinition } from "@/lib/form-schema/schema";
import type { TriggerEvent } from "@/lib/workflow-schema/nodes";
import type { WorkflowDefinition, WorkflowNode } from "@/lib/workflow-schema/schema";

/**
 * Everything a workflow run needs to evaluate conditions and execute actions
 * — assembled once by run.ts (DB-backed) and passed down into the pure
 * interpreter, so the interpreter itself never touches the database.
 *
 * `response_submitted` runs populate form/response/answers; every other
 * trigger type (schedule, scheduled_once, webhook_inbound, manual) instead
 * populates `digest` — the new responses since the workflow's last run,
 * scoped to the trigger's selected forms (0015) — and answers/rawAnswers
 * stay empty (guarded to "" by placeholders.ts, not thrown).
 */
export interface DigestResponse {
  responseId: string;
  formId: string;
  formTitle: string;
  submittedAt: string;
  answers: { fieldId: string; fieldType: string; value: unknown }[];
}

export interface RunDigest {
  responses: DigestResponse[];
  /** null when this is the workflow's first-ever run (no prior window to bound "new"). */
  windowStart: string | null;
  windowEnd: string;
  /** True when more new responses exist than DIGEST_RESPONSE_LIMIT — surfaced in {{digest:list}} and webhook payloads. */
  truncated: boolean;
}

export interface RunContext {
  runId: string;
  workflowId: string;
  triggerType: TriggerEvent;
  /** Non-null only for response_submitted runs. */
  formId: string | null;
  /** Non-null only for response_submitted runs. */
  responseId: string | null;
  isTest: boolean;
  /** True for a dry-run test invoked from the editor — actions must simulate instead of executing. */
  dryRun: boolean;
  /** Non-null only for response_submitted runs. */
  form: FormDefinition | null;
  answers: AnswerMap;
  /** Raw field-id -> value/type answers, for actions that need more than the AnswerMap gives (e.g. webhook payload). Empty for non-response runs. */
  rawAnswers: { fieldId: string; fieldType: string; value: unknown }[];
  /** Non-null only for response_submitted runs. */
  response: {
    id: string;
    submittedAt: string;
  } | null;
  /** Populated for schedule/scheduled_once/webhook_inbound/manual runs. */
  digest: RunDigest | null;
  /** The inbound webhook's parsed JSON body — only for webhook_inbound runs. */
  webhookPayload: unknown | null;
  /** Set by the aiAction handler (summarize task); consumed by {{ai:result}} in later nodes — mutable because the interpreter walks strictly sequentially. */
  aiResult?: string;
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
