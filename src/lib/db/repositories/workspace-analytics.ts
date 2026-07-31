import "server-only";
import { ratio } from "@/lib/analytics/rates";
import { APP_TIME_ZONE, buildDayRange, dayKey } from "@/lib/analytics/time-series";
import { createUserClient } from "@/lib/db/user-client";
import { listRunsForWorkflows, type WorkflowRunStatus } from "@/lib/db/repositories/workflow-runs";
import { listWorkflows } from "@/lib/db/repositories/workflows";
import type { TriggerEvent } from "@/lib/workflow-schema/nodes";

/**
 * Workspace-wide time-series and workflow-activity aggregates for the
 * dashboard (RLS-scoped via `createUserClient()`, mirroring
 * workspace-overview.ts's `listRecentResponses`). No rollup table — see
 * that file's header note on portfolio-scale volumes. Bucketing math itself
 * lives in the pure lib/analytics/* modules so it stays unit-testable
 * without a DB.
 */

export const ACTIVITY_WINDOW_DAYS = 30;

export interface DailyBucket {
  date: string;
  views: number;
  starts: number;
  responses: number;
}

export interface WindowTotals {
  views: number;
  starts: number;
  responses: number;
}

export interface WorkspaceTimeSeries {
  /** Exactly `days` entries, oldest → newest, zero-filled. */
  days: DailyBucket[];
  /** Totals for `days`. */
  current: WindowTotals;
  /** Totals for the `days`-sized window immediately before — the delta baseline. */
  previous: WindowTotals;
}

function emptyWindowTotals(): WindowTotals {
  return { views: 0, starts: 0, responses: 0 };
}

function emptySeries(days: number, now: Date): WorkspaceTimeSeries {
  return {
    days: buildDayRange(now, days).map((date) => ({ date, views: 0, starts: 0, responses: 0 })),
    current: emptyWindowTotals(),
    previous: emptyWindowTotals(),
  };
}

/**
 * 30-day (by default) daily activity, plus the same-length window before it
 * for trend deltas. `formIds` must already be RLS-authorized by the caller
 * (mirrors `listRecentResponses(forms)`).
 *
 * JS-side bucketing, not a Postgres RPC: every existing analytics query in
 * this repo (analytics.ts, forms.ts) already aggregates in JS, and an RPC
 * would need its own hand-rolled membership check to replace RLS for zero
 * benefit at current volumes (revisit if a single workspace approaches
 * ~100k events per 60-day window).
 */
export async function getWorkspaceTimeSeries(
  formIds: string[],
  options?: { days?: number; now?: Date },
): Promise<WorkspaceTimeSeries> {
  const days = options?.days ?? ACTIVITY_WINDOW_DAYS;
  const now = options?.now ?? new Date();

  if (formIds.length === 0) return emptySeries(days, now);

  const currentRange = buildDayRange(now, days);
  // Anchor on the same noon-UTC instant buildDayRange uses internally, then
  // step back `days` more calendar days — DST-safe for the same reason
  // buildDayRange's own stepping is (see that function's doc comment).
  const currentAnchor = new Date(`${currentRange[0]}T12:00:00.000Z`);
  const previousRange = buildDayRange(
    new Date(currentAnchor.getTime() - 24 * 60 * 60 * 1000),
    days,
  );

  // A generous lower bound for the query — a day earlier than the oldest
  // bucket, to absorb the UTC/Europe-Berlin offset at the boundary. Events
  // outside the two known day-key ranges are simply never summed below, so
  // over-fetching here can't corrupt the totals.
  const cutoffISO = new Date(
    new Date(`${previousRange[0]}T00:00:00.000Z`).getTime() - 24 * 60 * 60 * 1000,
  ).toISOString();

  const supabase = await createUserClient();
  const [{ data: events }, { data: responses }] = await Promise.all([
    supabase
      .from("form_events")
      .select("event_type, session_id, created_at")
      .in("form_id", formIds)
      .in("event_type", ["view", "page_view"])
      .gte("created_at", cutoffISO),
    supabase
      .from("responses")
      .select("submitted_at")
      .in("form_id", formIds)
      .eq("status", "completed")
      .gte("submitted_at", cutoffISO),
  ]);

  const viewsByDay = new Map<string, number>();
  const responsesByDay = new Map<string, number>();
  const startsByDay = new Map<string, number>();

  for (const event of events ?? []) {
    if (event.event_type === "view") {
      const key = dayKey(event.created_at, APP_TIME_ZONE);
      viewsByDay.set(key, (viewsByDay.get(key) ?? 0) + 1);
    }
  }

  // Attribute each session to the day of its FIRST page_view within this
  // fetch window — a session spanning midnight (or, at the edges, the
  // window boundary) must only ever count once. Sort ascending so "first"
  // is well-defined regardless of the order Postgres returned rows in.
  const pageViews = (events ?? [])
    .filter((e) => e.event_type === "page_view")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const seenSessions = new Set<string>();
  for (const event of pageViews) {
    if (seenSessions.has(event.session_id)) continue;
    seenSessions.add(event.session_id);
    const key = dayKey(event.created_at, APP_TIME_ZONE);
    startsByDay.set(key, (startsByDay.get(key) ?? 0) + 1);
  }

  for (const response of responses ?? []) {
    const key = dayKey(response.submitted_at, APP_TIME_ZONE);
    responsesByDay.set(key, (responsesByDay.get(key) ?? 0) + 1);
  }

  function bucketsFor(range: string[]): DailyBucket[] {
    return range.map((date) => ({
      date,
      views: viewsByDay.get(date) ?? 0,
      starts: startsByDay.get(date) ?? 0,
      responses: responsesByDay.get(date) ?? 0,
    }));
  }

  function sum(buckets: DailyBucket[]): WindowTotals {
    return buckets.reduce(
      (acc, b) => ({
        views: acc.views + b.views,
        starts: acc.starts + b.starts,
        responses: acc.responses + b.responses,
      }),
      emptyWindowTotals(),
    );
  }

  const currentBuckets = bucketsFor(currentRange);
  const previousBuckets = bucketsFor(previousRange);

  return {
    days: currentBuckets,
    current: sum(currentBuckets),
    previous: sum(previousBuckets),
  };
}

export interface WorkflowActivity {
  counts: Record<WorkflowRunStatus, number>;
  successRate: number | null;
  recentRuns: {
    id: string;
    workflowId: string;
    workflowName: string;
    status: WorkflowRunStatus;
    triggerType: TriggerEvent;
    createdAt: string;
    errorMessage: string | null;
  }[];
  workflowCount: number;
}

const RECENT_RUN_LIMIT = 6;
const RUN_ACTIVITY_WINDOW_DAYS = 30;

/**
 * Workspace-wide workflow run activity. `listWorkflows` (RLS-scoped) IS the
 * authorization boundary here — workflow_runs itself has no RLS policy for
 * `authenticated`, so run rows are only ever fetched for workflow IDs this
 * call has already proven the caller can see (mirrors how
 * getWorkspaceOverview derives its response query from listForms).
 */
export async function getWorkspaceWorkflowActivity(workspaceId: string): Promise<WorkflowActivity> {
  const workflows = await listWorkflows(workspaceId);

  if (workflows.length === 0) {
    return {
      counts: { queued: 0, running: 0, succeeded: 0, failed: 0 },
      successRate: null,
      recentRuns: [],
      workflowCount: 0,
    };
  }

  const nameById = new Map(workflows.map((w) => [w.id, w.name]));
  const since = new Date(Date.now() - RUN_ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const runs = await listRunsForWorkflows(
    workflows.map((w) => w.id),
    since,
  );

  const counts: Record<WorkflowRunStatus, number> = {
    queued: 0,
    running: 0,
    succeeded: 0,
    failed: 0,
  };
  for (const run of runs) counts[run.status] += 1;

  return {
    counts,
    // In-flight runs (queued/running) stay out of the denominator — otherwise
    // the rate would dip on every enqueue and recover once it finishes.
    successRate: ratio(counts.succeeded, counts.succeeded + counts.failed),
    recentRuns: runs.slice(0, RECENT_RUN_LIMIT).map((run) => ({
      id: run.id,
      workflowId: run.workflowId,
      workflowName: nameById.get(run.workflowId) ?? "Unbekannter Workflow",
      status: run.status,
      triggerType: run.triggerType,
      createdAt: run.createdAt,
      errorMessage: run.errorMessage,
    })),
    workflowCount: workflows.length,
  };
}
