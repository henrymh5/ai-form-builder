import {
  appendResponseNoteForWorkflow,
  markResponseReadForWorkflow,
  setResponseStatusForWorkflow,
} from "@/lib/db/repositories/workflow-runs";
import type { WorkflowNode } from "@/lib/workflow-schema/schema";
import type { ActionHandler } from "../context";
import { resolvePlaceholders } from "../placeholders";

/** "responseAction" node — set_status / append_note / mark_read on the triggering response. */
export const runResponseAction: ActionHandler = async (node, ctx) => {
  if (node.type !== "responseAction") throw new Error("Falscher Knotentyp für responseAction.");
  const { config } = node;

  if (ctx.dryRun) {
    return { output: { simulated: true, action: config.action } };
  }

  switch (config.action) {
    case "set_status": {
      if (!config.status) throw new Error("Kein Zielstatus für set_status konfiguriert.");
      await setResponseStatusForWorkflow(ctx.responseId, config.status);
      return { output: { action: "set_status", status: config.status } };
    }
    case "mark_read": {
      await markResponseReadForWorkflow(ctx.responseId);
      return { output: { action: "mark_read" } };
    }
    case "append_note": {
      const text = resolvePlaceholders(config.noteText ?? "", ctx);
      await appendResponseNoteForWorkflow(ctx.responseId, text);
      return { output: { action: "append_note", text } };
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
