import {
  appendResponseNoteForWorkflowBatch,
  markResponseReadForWorkflowBatch,
  setResponseStatusForWorkflowBatch,
} from "@/lib/db/repositories/workflow-runs";
import type { WorkflowNode } from "@/lib/workflow-schema/schema";
import type { ActionHandler } from "../context";
import { resolvePlaceholders } from "../placeholders";

/**
 * "responseAction" node — set_status / append_note / mark_read.
 *
 * Applies to the single triggering response (response_submitted runs) OR to
 * every response in the digest (schedule/webhook/manual runs, bounded by
 * DIGEST_RESPONSE_LIMIT) — unified into one "list of response IDs" so both
 * modes share the same batched-write path.
 */
export const runResponseAction: ActionHandler = async (node, ctx) => {
  if (node.type !== "responseAction") throw new Error("Falscher Knotentyp für responseAction.");
  const { config } = node;

  const responseIds = ctx.digest
    ? ctx.digest.responses.map((r) => r.responseId)
    : ctx.responseId
      ? [ctx.responseId]
      : [];

  if (ctx.dryRun) {
    return { output: { simulated: true, action: config.action, appliedTo: responseIds.length } };
  }

  if (responseIds.length === 0) {
    return { output: { action: config.action, appliedTo: 0 } };
  }

  switch (config.action) {
    case "set_status": {
      if (!config.status) throw new Error("Kein Zielstatus für set_status konfiguriert.");
      await setResponseStatusForWorkflowBatch(responseIds, config.status);
      return {
        output: { action: "set_status", status: config.status, appliedTo: responseIds.length },
      };
    }
    case "mark_read": {
      await markResponseReadForWorkflowBatch(responseIds);
      return { output: { action: "mark_read", appliedTo: responseIds.length } };
    }
    case "append_note": {
      const text = resolvePlaceholders(config.noteText ?? "", ctx);
      await appendResponseNoteForWorkflowBatch(responseIds, text);
      return { output: { action: "append_note", text, appliedTo: responseIds.length } };
    }
    default:
      throw new Error(`Unbekannte Response-Aktion: ${config.action}`);
  }
};

export function isResponseActionNode(
  node: WorkflowNode,
): node is Extract<WorkflowNode, { type: "responseAction" }> {
  return node.type === "responseAction";
}
