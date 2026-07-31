import { timingSafeEqual } from "node:crypto";
import { after, NextResponse } from "next/server";
import {
  claimScheduledWorkflow,
  enqueueWorkflowRun,
  listDueScheduledWorkflows,
} from "@/lib/db/repositories/workflow-runs";
import { computeNextRunAt } from "@/lib/workflow-engine/schedule";
import { executeWorkflowRun } from "@/lib/workflow-engine/run";
import { getTriggerConfig } from "@/lib/workflow-schema/nodes";

/**
 * POST /api/cron/workflows — polled every few minutes by Supabase pg_cron +
 * pg_net (docs/cron-setup.sql; NOT provisioned by a migration, since it
 * needs the deployed app URL + secret at runtime). Never throws: an
 * unhandled error here would surface as a noisy pg_net failure with nothing
 * useful for pg_cron to do about it, so every failure path returns 200 with
 * a best-effort partial result instead.
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const headerBytes = Buffer.from(header);
  const expectedBytes = Buffer.from(expected);
  if (headerBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(headerBytes, expectedBytes);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Unauthorized." } },
      { status: 401 },
    );
  }

  const now = new Date();
  const due = await listDueScheduledWorkflows(now).catch(() => []);

  const runIds: string[] = [];
  for (const workflow of due) {
    const triggerConfig = getTriggerConfig(workflow.definition.nodes);
    if (
      !triggerConfig ||
      (triggerConfig.event !== "schedule" && triggerConfig.event !== "scheduled_once")
    ) {
      continue; // stale next_run_at from a since-edited trigger — skip, don't fire
    }

    const nextOccurrence = computeNextRunAt(triggerConfig, now);
    const claimed = await claimScheduledWorkflow(workflow.id, workflow.nextRunAt, {
      nextRunAt: nextOccurrence?.toISOString() ?? null,
      lastDigestAt: now.toISOString(),
      pause: triggerConfig.event === "scheduled_once",
    }).catch(() => false);
    if (!claimed) continue; // lost the race to an overlapping tick, or already re-claimed

    const dedupeKey =
      triggerConfig.event === "scheduled_once"
        ? `once:${triggerConfig.runAt}`
        : `schedule:${workflow.nextRunAt}`;

    const runId = await enqueueWorkflowRun({
      workflowId: workflow.id,
      definition: workflow.definition,
      triggerType: triggerConfig.event,
      dedupeKey,
      triggerContext: {
        windowStart: workflow.lastDigestAt ?? workflow.createdAt,
        windowEnd: now.toISOString(),
      },
    }).catch(() => null);
    if (runId) runIds.push(runId);
  }

  after(async () => {
    for (const runId of runIds) {
      await executeWorkflowRun(runId).catch(() => {
        // Failures are recorded on the run itself; nothing else to do in a fire-and-forget tick.
      });
    }
  });

  return NextResponse.json({ enqueued: runIds.length });
}
