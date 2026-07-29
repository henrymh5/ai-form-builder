import { evaluateCondition } from "@/lib/logic-engine/evaluate";
import type { Condition } from "@/lib/form-schema/conditions";
import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-schema/schema";
import type {
  ActionRegistry,
  InterpreterResult,
  RunContext,
  WorkflowStepEvent,
} from "./context";

/**
 * Pure graph-walking interpreter — no DB access, testable with a mock action
 * registry. run.ts wraps this with DB-backed step persistence (onStep) and
 * with the real action registry.
 *
 * Error strategy: an action node that throws fails the step AND the run —
 * there is no "other branch to fall back to" in the max-one-edge-per-handle
 * graph model, so this keeps behavior simple and predictable.
 */

const MAX_STEPS = 50;
const ACTION_TIMEOUT_MS = 10_000;
const AI_ACTION_TIMEOUT_MS = 30_000;

export type StepCallback = (event: WorkflowStepEvent) => void | Promise<void>;

export interface RunGraphParams {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  ctx: RunContext;
  registry: ActionRegistry;
  onStep?: StepCallback;
}

function nextNode(
  nodeId: string,
  handle: "out" | "true" | "false",
  edges: WorkflowEdge[],
  nodeById: Map<string, WorkflowNode>,
): WorkflowNode | undefined {
  const edge = edges.find((e) => e.source === nodeId && e.sourceHandle === handle);
  if (!edge) return undefined;
  return nodeById.get(edge.target);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(`Zeitüberschreitung bei "${label}".`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutHandle!);
  }
}

export async function runWorkflowGraph(params: RunGraphParams): Promise<InterpreterResult> {
  const { nodes, edges, ctx, registry, onStep } = params;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const trigger = nodes.find((n) => n.type === "trigger");

  const steps: WorkflowStepEvent[] = [];
  const emit = async (event: WorkflowStepEvent) => {
    steps.push(event);
    if (onStep) await onStep(event);
  };

  if (!trigger) {
    return { status: "failed", errorCode: "NO_TRIGGER", errorMessage: "Kein Trigger-Knoten gefunden.", steps };
  }

  let current: WorkflowNode | undefined = nextNode(trigger.id, "out", edges, nodeById);
  let stepCount = 0;

  while (current) {
    stepCount += 1;
    if (stepCount > MAX_STEPS) {
      return {
        status: "failed",
        errorCode: "STEP_LIMIT_EXCEEDED",
        errorMessage: "Der Workflow hat die maximale Schrittanzahl überschritten.",
        steps,
      };
    }

    if (current.type === "condition") {
      const asCondition: Condition = {
        id: current.id,
        logic: current.config.logic,
        rules: current.config.rules,
        action: "show_field", // unused by evaluateCondition; only rules+logic matter
      };
      const result = evaluateCondition(asCondition, ctx.answers);
      await emit({
        nodeId: current.id,
        nodeType: "condition",
        status: "succeeded",
        output: { result },
      });
      current = nextNode(current.id, result ? "true" : "false", edges, nodeById);
      continue;
    }

    const handler = registry[current.type];
    if (!handler) {
      await emit({
        nodeId: current.id,
        nodeType: current.type,
        status: "skipped",
        errorMessage: `Kein Handler für Knotentyp "${current.type}" registriert.`,
      });
      current = nextNode(current.id, "out", edges, nodeById);
      continue;
    }

    const timeoutMs = current.type === "aiAction" ? AI_ACTION_TIMEOUT_MS : ACTION_TIMEOUT_MS;
    const node = current;
    try {
      const result = await withTimeout(handler(node, ctx), timeoutMs, node.type);
      await emit({
        nodeId: node.id,
        nodeType: node.type,
        status: "succeeded",
        output: result.output,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler.";
      await emit({ nodeId: node.id, nodeType: node.type, status: "failed", errorMessage: message });
      return { status: "failed", errorCode: "ACTION_FAILED", errorMessage: message, steps };
    }

    current = nextNode(current.id, "out", edges, nodeById);
  }

  return { status: "succeeded", steps };
}
