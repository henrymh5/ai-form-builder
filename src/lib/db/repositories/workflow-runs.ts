import "server-only";
import { createServiceClient } from "@/lib/db/service-client";
import type { FormDefinition } from "@/lib/form-schema/schema";
import { getTriggerConfig, type TriggerEvent } from "@/lib/workflow-schema/nodes";
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
 * Fetches enabled workflows whose trigger is attached to this form AND
 * whose trigger event is `response_submitted` — joins through
 * workflow_form_triggers (0013) since a workflow can be triggered by
 * multiple forms, then filters out schedule/webhook/manual workflows: their
 * formIds are a DIGEST SCOPE, not a submission trigger, so they must never
 * fire from this path (0015).
 */
export async function listEnabledWorkflowsForForm(formId: string): Promise<EnabledWorkflow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("workflows")
    .select("id, definition, workflow_form_triggers!inner(form_id)")
    .eq("workflow_form_triggers.form_id", formId)
    .eq("status", "enabled");

  if (error || !data) return [];

  return data
    .map((w) => ({ id: w.id, definition: w.definition as unknown as WorkflowDefinition }))
    .filter((w) => getTriggerConfig(w.definition.nodes)?.event === "response_submitted");
}

export interface WorkspaceRunSummary {
  id: string;
  workflowId: string;
  status: WorkflowRunStatus;
  triggerType: TriggerEvent;
  errorMessage: string | null;
  createdAt: string;
}

/**
 * Runs across a set of workflows, newest first — used by the dashboard's
 * workspace-wide workflow-activity panel. `workflowIds` must already be
 * RLS-authorized by the caller (e.g. via `listWorkflows`), mirroring how
 * `getWorkspaceOverview` derives its response query from `listForms`:
 * workflow_runs itself has no RLS policy for `authenticated`, so this
 * function is the service-role read, not the authorization boundary.
 * Excludes test runs from these productive figures.
 */
export async function listRunsForWorkflows(
  workflowIds: string[],
  sinceISO: string,
  limit = 200,
): Promise<WorkspaceRunSummary[]> {
  if (workflowIds.length === 0) return [];

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("workflow_runs")
    .select("id, workflow_id, status, trigger_type, error_message, created_at")
    .in("workflow_id", workflowIds)
    .eq("is_test", false)
    .gte("created_at", sinceISO)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((r) => ({
    id: r.id,
    workflowId: r.workflow_id,
    status: r.status as WorkflowRunStatus,
    triggerType: r.trigger_type as TriggerEvent,
    errorMessage: r.error_message,
    createdAt: r.created_at,
  }));
}

export interface TriggerContextSnapshot {
  /** Digest window — new responses strictly after `windowStart` (or all, if null) up to and including `windowEnd`. */
  windowStart?: string | null;
  windowEnd?: string;
  /** Inbound webhook POST body (already JSON-parsed), only for webhook_inbound runs. */
  payload?: unknown;
}

export interface EnqueueRunParams {
  workflowId: string;
  /** null for runs not scoped to a single form (schedule/webhook/manual digests). */
  formId?: string | null;
  /** null for runs not tied to a single response. */
  responseId?: string | null;
  definition: WorkflowDefinition;
  triggerType: TriggerEvent;
  /** Uniform idempotency key — 'response:<id>' / 'schedule:<tickISO>' / 'once:<runAtISO>' / 'webhook:<nanoid>' / 'manual:<nanoid>'. */
  dedupeKey: string;
  triggerContext?: TriggerContextSnapshot | null;
  isTest?: boolean;
  attempt?: number;
}

/**
 * Inserts a queued run. Relies on `workflow_runs_unique_per_dedupe_idx`
 * (0015, partial on `is_test = false`) for idempotency — a duplicate
 * (workflow, dedupeKey, attempt) insert hits a unique violation, which is
 * swallowed here rather than surfaced as an error (the run already exists).
 */
export async function enqueueWorkflowRun(params: EnqueueRunParams): Promise<string | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("workflow_runs")
    .insert({
      workflow_id: params.workflowId,
      form_id: params.formId ?? null,
      response_id: params.responseId ?? null,
      definition_snapshot: params.definition as never,
      trigger_type: params.triggerType,
      dedupe_key: params.dedupeKey,
      trigger_context: (params.triggerContext ?? null) as never,
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
  formId: string | null;
  responseId: string | null;
  triggerType: TriggerEvent;
  dedupeKey: string;
  triggerContext: TriggerContextSnapshot | null;
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
    triggerType: data.trigger_type as TriggerEvent,
    dedupeKey: data.dedupe_key,
    triggerContext: data.trigger_context as unknown as TriggerContextSnapshot | null,
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
 * workflow plan): sufficient because runs are created once per
 * (workflow, dedupeKey, attempt) and `after()` only fires once per enqueue.
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
  responseId: string | null;
  triggerType: TriggerEvent;
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
      "id, response_id, trigger_type, status, attempt, is_test, error_message, started_at, finished_at, created_at",
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
      triggerType: r.trigger_type as TriggerEvent,
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
// Batch variants exist for digest-mode runs, where the action applies to
// every response in the digest (bounded by DIGEST_RESPONSE_LIMIT below).
// ---------------------------------------------------------------------------

export async function setResponseStatusForWorkflow(
  responseId: string,
  status: "completed" | "spam" | "archived",
): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("responses").update({ status }).eq("id", responseId);
}

export async function setResponseStatusForWorkflowBatch(
  responseIds: string[],
  status: "completed" | "spam" | "archived",
): Promise<void> {
  if (responseIds.length === 0) return;
  const supabase = createServiceClient();
  await supabase.from("responses").update({ status }).in("id", responseIds);
}

export async function markResponseReadForWorkflow(responseId: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("responses")
    .update({ read_at: new Date().toISOString() })
    .eq("id", responseId)
    .is("read_at", null);
}

export async function markResponseReadForWorkflowBatch(responseIds: string[]): Promise<void> {
  if (responseIds.length === 0) return;
  const supabase = createServiceClient();
  await supabase
    .from("responses")
    .update({ read_at: new Date().toISOString() })
    .in("id", responseIds)
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

/** Appends the SAME text to each response's note — one read+write per response (notes differ per row). */
export async function appendResponseNoteForWorkflowBatch(
  responseIds: string[],
  text: string,
): Promise<void> {
  for (const responseId of responseIds) {
    await appendResponseNoteForWorkflow(responseId, text);
  }
}

export interface WorkflowRunMeta {
  name: string;
  createdBy: string | null;
  webhookSecret: string | null;
  workspaceId: string;
}

/** Workflow metadata needed to assemble a RunContext — service-role since runs have no authenticated session. */
export async function getWorkflowRunMeta(workflowId: string): Promise<WorkflowRunMeta | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("workflows")
    .select("name, created_by, webhook_secret, workspace_id")
    .eq("id", workflowId)
    .maybeSingle();
  if (!data) return null;
  return {
    name: data.name,
    createdBy: data.created_by,
    webhookSecret: data.webhook_secret,
    workspaceId: data.workspace_id,
  };
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

// ---------------------------------------------------------------------------
// Scheduling (0015): due-workflow polling, optimistic claim, digest window
// advancement, and the digest response query itself.
// ---------------------------------------------------------------------------

export interface DueScheduledWorkflow {
  id: string;
  definition: WorkflowDefinition;
  nextRunAt: string;
  lastDigestAt: string | null;
  createdAt: string;
}

/** Enabled workflows whose next_run_at has arrived — polled by the cron route. */
export async function listDueScheduledWorkflows(
  now: Date,
  limit = 25,
): Promise<DueScheduledWorkflow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("workflows")
    .select("id, definition, next_run_at, last_digest_at, created_at")
    .eq("status", "enabled")
    .not("next_run_at", "is", null)
    .lte("next_run_at", now.toISOString())
    .limit(limit);

  if (error || !data) return [];

  return data
    .filter((w): w is typeof w & { next_run_at: string } => w.next_run_at !== null)
    .map((w) => ({
      id: w.id,
      definition: w.definition as unknown as WorkflowDefinition,
      nextRunAt: w.next_run_at,
      lastDigestAt: w.last_digest_at,
      createdAt: w.created_at,
    }));
}

/**
 * Optimistically claims a due workflow for one cron tick — the conditional
 * `.eq("next_run_at", expectedNextRunAt)` means an overlapping tick that won
 * the race first (and already advanced next_run_at) makes this a no-op
 * (mirrors claimWorkflowRun's claim-by-conditional-update pattern).
 */
export async function claimScheduledWorkflow(
  workflowId: string,
  expectedNextRunAt: string,
  patch: { nextRunAt: string | null; lastDigestAt: string; pause?: boolean },
): Promise<boolean> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("workflows")
    .update({
      next_run_at: patch.nextRunAt,
      last_digest_at: patch.lastDigestAt,
      ...(patch.pause ? { status: "paused" } : {}),
    })
    .eq("id", workflowId)
    .eq("next_run_at", expectedNextRunAt)
    .select("id");

  return !error && !!data && data.length > 0;
}

/** Advances last_digest_at for a non-scheduled digest run (webhook/manual) — no claim needed, only one caller at a time triggers these paths per request. */
export async function advanceDigestWindow(workflowId: string, windowEnd: Date): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("workflows")
    .update({ last_digest_at: windowEnd.toISOString() })
    .eq("id", workflowId);
}

export interface DigestResponse {
  responseId: string;
  formId: string;
  formTitle: string;
  submittedAt: string;
  answers: { fieldId: string; fieldType: string; value: unknown }[];
}

export interface DigestResult {
  responses: DigestResponse[];
  truncated: boolean;
}

/** Hard cap on how many responses a single digest run processes — bounds write volume (responseAction) and step latency. */
export const DIGEST_RESPONSE_LIMIT = 100;

/**
 * New, non-test responses across `formIds` in `(since, until]` — the digest
 * context for schedule/webhook/manual runs. `since = null` means "from the
 * beginning" (a workflow's very first digest run).
 */
export async function getDigestResponses(
  formIds: string[],
  since: string | null,
  until: string,
  limit: number = DIGEST_RESPONSE_LIMIT,
): Promise<DigestResult> {
  if (formIds.length === 0) return { responses: [], truncated: false };

  const supabase = createServiceClient();
  let query = supabase
    .from("responses")
    .select("id, form_id, submitted_at")
    .in("form_id", formIds)
    .neq("status", "test")
    .lte("submitted_at", until)
    .order("submitted_at", { ascending: true })
    .limit(limit + 1);
  if (since) query = query.gt("submitted_at", since);

  const { data: responseRows, error } = await query;
  if (error || !responseRows) return { responses: [], truncated: false };

  const truncated = responseRows.length > limit;
  const page = truncated ? responseRows.slice(0, limit) : responseRows;
  if (page.length === 0) return { responses: [], truncated: false };

  const [{ data: answerRows }, { data: formRows }] = await Promise.all([
    supabase
      .from("response_answers")
      .select("response_id, field_id, field_type, value")
      .in(
        "response_id",
        page.map((r) => r.id),
      ),
    supabase
      .from("forms")
      .select("id, title")
      .in("id", [...new Set(page.map((r) => r.form_id))]),
  ]);

  const titleByFormId = new Map((formRows ?? []).map((f) => [f.id, f.title]));
  const answersByResponse = new Map<
    string,
    { fieldId: string; fieldType: string; value: unknown }[]
  >();
  for (const a of answerRows ?? []) {
    const list = answersByResponse.get(a.response_id) ?? [];
    list.push({ fieldId: a.field_id, fieldType: a.field_type, value: a.value });
    answersByResponse.set(a.response_id, list);
  }

  return {
    responses: page.map((r) => ({
      responseId: r.id,
      formId: r.form_id,
      formTitle: titleByFormId.get(r.form_id) ?? "Formular",
      submittedAt: r.submitted_at,
      answers: answersByResponse.get(r.id) ?? [],
    })),
    truncated,
  };
}

export interface WorkflowByToken {
  id: string;
  status: "enabled" | "paused";
  definition: WorkflowDefinition;
  lastDigestAt: string | null;
  createdAt: string;
}

/** Looks up a workflow by its inbound-webhook token — used by the public trigger route (uniform 404 on any mismatch). */
export async function getWorkflowByInboundToken(token: string): Promise<WorkflowByToken | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("workflows")
    .select("id, status, definition, last_digest_at, created_at")
    .eq("inbound_token", token)
    .maybeSingle();
  if (error || !data) return null;

  return {
    id: data.id,
    status: data.status as "enabled" | "paused",
    definition: data.definition as unknown as WorkflowDefinition,
    lastDigestAt: data.last_digest_at,
    createdAt: data.created_at,
  };
}

export interface WorkflowScheduleMeta {
  status: "enabled" | "paused";
  definition: WorkflowDefinition;
  lastDigestAt: string | null;
  createdAt: string;
}

/** Workflow metadata for the manual-trigger server action (status/definition/digest window). */
export async function getWorkflowScheduleMeta(
  workflowId: string,
): Promise<WorkflowScheduleMeta | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("workflows")
    .select("status, definition, last_digest_at, created_at")
    .eq("id", workflowId)
    .maybeSingle();
  if (error || !data) return null;

  return {
    status: data.status as "enabled" | "paused",
    definition: data.definition as unknown as WorkflowDefinition,
    lastDigestAt: data.last_digest_at,
    createdAt: data.created_at,
  };
}
