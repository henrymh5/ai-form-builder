import type { ActionRegistry } from "../context";
import { runAiAction } from "./ai-action";
import { runEmailAction } from "./email";
import { runResponseAction } from "./response-action";
import { runWebhookAction } from "./webhook";

/** The real action registry used by run.ts — wires every action node type to its handler. */
export const defaultActionRegistry: ActionRegistry = {
  email: runEmailAction,
  webhook: runWebhookAction,
  responseAction: runResponseAction,
  aiAction: runAiAction,
};
