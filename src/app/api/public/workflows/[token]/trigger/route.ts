import { customAlphabet } from "nanoid";
import { after, NextResponse } from "next/server";
import {
  advanceDigestWindow,
  enqueueWorkflowRun,
  getWorkflowByInboundToken,
} from "@/lib/db/repositories/workflow-runs";
import { checkRateLimit } from "@/lib/db/repositories/rate-limit";
import { AppError, isAppError } from "@/lib/errors";
import { executeWorkflowRun } from "@/lib/workflow-engine/run";
import { getTriggerConfig } from "@/lib/workflow-schema/nodes";

const MAX_PAYLOAD_BYTES = 64_000;
const dedupeAlphabet = customAlphabet(
  "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ",
  16,
);

/**
 * POST /api/public/workflows/:token/trigger — the public inbound endpoint
 * for `webhook_inbound` workflow triggers. Unlike the outbound "webhook"
 * action, `token` here is a capability URL: anyone who has it can fire the
 * workflow, so an unknown/paused/wrong-trigger-type token must all resolve
 * to the exact same 404 response — differentiating them would let an
 * attacker probe which tokens exist.
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > MAX_PAYLOAD_BYTES) {
      throw new AppError("PAYLOAD_TOO_LARGE", "Anfrage zu groß.");
    }
    const rawBody = await request.text();
    if (rawBody.length > MAX_PAYLOAD_BYTES) {
      throw new AppError("PAYLOAD_TOO_LARGE", "Anfrage zu groß.");
    }

    let payload: unknown = {};
    if (rawBody.trim().length > 0) {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Der Payload ist kein gültiges JSON." } },
          { status: 400 },
        );
      }
    }

    const workflow = await getWorkflowByInboundToken(token);
    const triggerConfig = workflow ? getTriggerConfig(workflow.definition.nodes) : null;
    if (!workflow || workflow.status !== "enabled" || triggerConfig?.event !== "webhook_inbound") {
      throw new AppError("NOT_FOUND", "Nicht gefunden.");
    }

    await checkRateLimit(
      { scope: "public:workflow-inbound", windowMs: 60_000, max: 30 },
      workflow.id,
    );

    const now = new Date();
    const windowStart = workflow.lastDigestAt ?? workflow.createdAt;
    await advanceDigestWindow(workflow.id, now);

    const runId = await enqueueWorkflowRun({
      workflowId: workflow.id,
      definition: workflow.definition,
      triggerType: "webhook_inbound",
      dedupeKey: `webhook:${dedupeAlphabet()}`,
      triggerContext: { windowStart, windowEnd: now.toISOString(), payload },
    });
    if (!runId) {
      throw new AppError("INTERNAL_ERROR", "Lauf konnte nicht erstellt werden.");
    }

    after(async () => {
      await executeWorkflowRun(runId).catch(() => {
        // Failures are recorded on the run itself; nothing else to do here.
      });
    });

    return NextResponse.json({ runId }, { status: 202 });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json(error.toResponseBody(), { status: error.status });
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unerwarteter Fehler." } },
      { status: 500 },
    );
  }
}
