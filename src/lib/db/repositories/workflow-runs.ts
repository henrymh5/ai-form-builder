import "server-only";
import { createServiceClient } from "@/lib/db/service-client";
import type { FormDefinition } from "@/lib/form-schema/schema";
import type { WorkflowDefinition } from "@/lib/workflow-schema/schema";

/**
 * Service-role-only access to workflow runs and their step logs — mirrors
 * lib/db/repositories/public-forms.ts / ai-usage-log.ts. workflow_runs and
 * workflow_run_steps have no insert/update policy for `authenticated`
 * (0012), because runs are frequently created from the anonymous
 * public-submission path. Also holds the response-mutation helpers used by
 * the "responseAction" node type, since those happen inside a workflow run
 * (which itself runs under the service role, not the authenticated user).
 */

export type WorkflowRunStatus = "queued" | "running" | "succeeded" | "failed";
export type WorkflowRunStepStatus = "running" | "succeeded" | "failed" | "skipped";

export interface EnabledWorkflow {
  id: string;
  definition: WorkflowDefinition;
}

/**
 * Fetches enabled workflows whose trigger is attached to this form, for the
 * enqueue step after a submission — joins through workflow_form_triggers
 * (0013) since a workflow can be triggered by multiple forms.
 */
export async function listEnabledWorkflowsForForm(formId: string): Promise<EnabledWorkflow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("workflows")
    .select("id, definition, workflow_form_triggers!inner(form_id)")
    .eq("workflow_form_triggers.form_id", formId)
    .eq("status", "enabled");

  if (error || !data) return [];

  return data.map((w) => ({
    id: w.id,
    definition: w.definition as unknown as WorkflowDefinition,
  }));
}

export interface EnqueueRunParams {
  workflowId: string;
  formId: string;
  responseId: string;
  definition: WorkflowDefinition;
  isTest?: boolean;
  attempt?: number;
}

/**
 * Inserts a queued run. Relies on `workflow_runs_unique_per_response_idx`
 * (0012, partial on `is_test = false`) for idempotency — a duplicate
 * (workflow, response, attempt) insert hits a unique violation, which is
 * swallowed here rather than surfaced as an error (the run already exists).
 */
export async function enqueueWorkflowRun(params: EnqueueRunParams): Promise<string | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("workflow_runs")
    .insert({
      workflow_id: params.workflowId,
      form_id: params.formId,
      response_id: params.responseId,
      definition_snapshot: params.definition as never,
      is_test: params.isTest ?? false,
      attempt: params.attempt ?? 1,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return null; // already enqueued — not an error
    throw error;
  }
  return data.id;
}

export interface WorkflowRunRecord {
  id: string;
  workflowId: string;
  formId: string;
  responseId: string;
  status: WorkflowRunStatus;
  definitionSnapshot: WorkflowDefinition;
  attempt: number;
  isTest: boolean;
  errorCode: string | null;
  errorMessage: string | null;
}

export async function getWorkflowRun(runId: string): Promise<WorkflowRunRecord | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("workflow_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    workflowId: data.workflow_id,
    formId: data.form_id,
    responseId: data.response_id,
    status: data.status as WorkflowRunStatus,
    definitionSnapshot: data.definition_snapshot as unknown as WorkflowDefinition,
    attempt: data.attempt,
    isTest: data.is_test,
    errorCode: data.error_code,
    errorMessage: data.error_message,
  };
}

/**
 * Atomically claims a queued run for execution — `update ... where status =
 * 'queued'` returns zero rows if another process already claimed it. This is
 * the whole locking strategy for v1 (documented pragmatic tradeoff in the
 * workflow plan): sufficient because runs are created once per (workflow,
 * response, attempt) and `after()` only fires once per enqueue.
 */
export async function claimWorkflowRun(runId: string): Promise<boolean> {
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("workflow_runs")
    .update({ status: "running", claimed_at: now, started_at: now })
    .eq("id", runId)
    .eq("status", "queued")
    .select("id");

  return !error && !!data && data.length > 0;
}

export async function finishWorkflowRun(
  runId: string,
  result: { status: "succeeded" } | { status: "failed"; errorCode: string; errorMessage: string },
): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("workflow_runs")
    .update({
      status: result.status,
      finished_at: new Date().toISOString(),
      error_code: result.status === "failed" ? result.errorCode : null,
      error_message: result.status === "failed" ? result.errorMessage : null,
    })
    .eq("id", runId);
}

export interface ListRunsFilter {
  page?: number;
  pageSize?: number;
}

export interface WorkflowRunSummary {
  id: string;
  responseId: string;
  status: WorkflowRunStatus;
  attempt: number;
  isTest: boolean;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

const DEFAULT_RUN_PAGE_SIZE = 20;

export async function listWorkflowRuns(
  workflowId: string,
  filter: ListRunsFilter = {},
): Promise<{ runs: WorkflowRunSummary[]; total: number }> {
  const supabase = createServiceClient();
  const page = filter.page ?? 1;
  const pageSize = filter.pageSize ?? DEFAULT_RUN_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("workflow_runs")
    .select(
      "id, response_id, status, attempt, is_test, error_message, started_at, finished_at, created_at",
      { count: "exact" },
    )
    .eq("workflow_id", workflowId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error || !data) return { runs: [], total: 0 };

  return {
    runs: data.map((r) => ({
      id: r.id,
      responseId: r.response_id,
      status: r.status as WorkflowRunStatus,
      attempt: r.attempt,
      isTest: r.is_test,
      errorMessage: r.error_message,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      createdAt: r.created_at,
    })),
    total: count ?? 0,
  };
}

export interface WorkflowRunStepRecord {
  id: string;
  nodeId: string;
  nodeType: string;
  status: WorkflowRunStepStatus;
  input: unknown;
  output: unknown;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export async function listWorkflowRunSteps(runId: string): Promise<WorkflowRunStepRecord[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("workflow_run_steps")
    .select("*")
    .eq("run_id", runId)
    .order("started_at", { ascending: true });

  if (error || !data) return [];

  return data.map((s) => ({
    id: s.id,
    nodeId: s.node_id,
    nodeType: s.node_type,
    status: s.status as WorkflowRunStepStatus,
    input: s.input,
    output: s.output,
    errorMessage: s.error_message,
    startedAt: s.started_at,
    finishedAt: s.finished_at,
  }));
}

/** Inserts a step in `running` state before execution — so a crashed run still shows where it got stuck. */
export async function startWorkflowRunStep(params: {
  runId: string;
  nodeId: string;
  nodeType: string;
  input?: unknown;
}): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("workflow_run_steps")
    .insert({
      run_id: params.runId,
      node_id: params.nodeId,
      node_type: params.nodeType,
      status: "running",
      input: (params.input ?? null) as never,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error("Failed to record workflow run step");
  return data.id;
}

export async function finishWorkflowRunStep(
  stepId: string,
  result: {
    status: Exclude<WorkflowRunStepStatus, "running">;
    output?: unknown;
    errorMessage?: string;
  },
): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("workflow_run_steps")
    .update({
      status: result.status,
      output: (result.output ?? null) as never,
      error_message: result.errorMessage ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", stepId);
}

// ---------------------------------------------------------------------------
// Response mutations for the "responseAction" node type. These run inside a
// workflow run (service-role context, no authenticated user), unlike the
// authenticated equivalents in repositories/responses.ts used by the UI.
// ---------------------------------------------------------------------------

export async function setResponseStatusForWorkflow(
  responseId: string,
  status: "completed" | "spam" | "archived",
): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("responses").update({ status }).eq("id", responseId);
}

export async function markResponseReadForWorkflow(responseId: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("responses")
    .update({ read_at: new Date().toISOString() })
    .eq("id", responseId)
    .is("read_at", null);
}

export async function appendResponseNoteForWorkflow(
  responseId: string,
  text: string,
): Promise<void> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("responses")
    .select("note")
    .eq("id", responseId)
    .maybeSingle();

  const nextNote = data?.note ? `${data.note}\n\n${text}` : text;
  await supabase.from("responses").update({ note: nextNote }).eq("id", responseId);
}

export interface WorkflowRunMeta {
  name: string;
  createdBy: string | null;
  webhookSecret: string | null;
}

/** Workflow metadata needed to assemble a RunContext — service-role since runs have no authenticated session. */
export async function getWorkflowRunMeta(workflowId: string): Promise<WorkflowRunMeta | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("workflows")
    .select("name, created_by, webhook_secret")
    .eq("id", workflowId)
    .maybeSingle();
  if (!data) return null;
  return { name: data.name, createdBy: data.created_by, webhookSecret: data.webhook_secret };
}

/**
 * Resolves the workflow creator's email for the "creator" email-node
 * recipient — a service-role admin lookup since run execution has no
 * authenticated session (mirrors find-user-by-email.ts's use of the Admin API).
 */
export async function getUserEmailById(userId: string): Promise<string | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user) return null;
  return data.user.email ?? null;
}

export interface ResponseAnswersForRun {
  formVersionId: string;
  submittedAt: string;
  answers: { fieldId: string; fieldType: string; value: unknown }[];
}

/** Loads a response's answers for the engine to build its AnswerMap from. */
export async function getResponseAnswersForRun(
  responseId: string,
): Promise<ResponseAnswersForRun | null> {
  const supabase = createServiceClient();
  const [{ data: response }, { data: answers }] = await Promise.all([
    supabase
      .from("responses")
      .select("form_version_id, submitted_at")
      .eq("id", responseId)
      .maybeSingle(),
    supabase
      .from("response_answers")
      .select("field_id, field_type, value")
      .eq("response_id", responseId),
  ]);

  if (!response) return null;

  return {
    formVersionId: response.form_version_id,
    submittedAt: response.submitted_at,
    answers: (answers ?? []).map((a) => ({
      fieldId: a.field_id,
      fieldType: a.field_type,
      value: a.value,
    })),
  };
}

/**
 * Resolves the form a response was submitted to — used to derive `formId`
 * for enqueue/test-run/retry server-side instead of trusting a
 * client-submitted pairing between a chosen response and a form.
 */
export async function getResponseFormId(responseId: string): Promise<string | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("responses")
    .select("form_id")
    .eq("id", responseId)
    .maybeSingle();
  return data?.form_id ?? null;
}

export interface RunForResponse {
  id: string;
  workflowId: string;
  workflowName: string;
  status: WorkflowRunStatus;
  isTest: boolean;
  createdAt: string;
}

/** Runs triggered by a specific response, across all of the form's workflows — for the response detail page. */
export async function listWorkflowRunsForResponse(responseId: string): Promise<RunForResponse[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("workflow_runs")
    .select("id, workflow_id, status, is_test, created_at, workflows(name)")
    .eq("response_id", responseId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((r) => ({
    id: r.id,
    workflowId: r.workflow_id,
    workflowName: (r.workflows as unknown as { name: string } | null)?.name ?? "Workflow",
    status: r.status as WorkflowRunStatus,
    isTest: r.is_test,
    createdAt: r.created_at,
  }));
}

export interface FormContextForRun {
  workspaceId: string;
  definition: FormDefinition;
}

/**
 * Loads the workspace ID and the exact form-version definition a response
 * was submitted against — used to build the run's AnswerMap and evaluate
 * conditions against the same field IDs the visitor actually saw, not the
 * (possibly since-edited) draft.
 */
export async function getFormContextForRun(
  formId: string,
  formVersionId: string,
): Promise<FormContextForRun | null> {
  const supabase = createServiceClient();
  const [{ data: form }, { data: version }] = await Promise.all([
    supabase.from("forms").select("workspace_id").eq("id", formId).maybeSingle(),
    supabase.from("form_versions").select("definition").eq("id", formVersionId).maybeSingle(),
  ]);

  if (!form || !version) return null;

  return {
    workspaceId: form.workspace_id,
    definition: version.definition as unknown as FormDefinition,
  };
}
