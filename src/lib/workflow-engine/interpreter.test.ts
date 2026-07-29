import { describe, expect, it, vi } from "vitest";
import { createEmptyFormDefinition } from "@/lib/form-schema/factory";
import type { FormDefinition } from "@/lib/form-schema/schema";
import { createEmptyWorkflowDefinition } from "@/lib/workflow-schema/factory";
import { generateWorkflowId } from "@/lib/workflow-schema/ids";
import type { WorkflowDefinition, WorkflowEdge, WorkflowNode } from "@/lib/workflow-schema/schema";
import type { ActionRegistry, RunContext } from "./context";
import { runWorkflowGraph } from "./interpreter";

function baseWorkflow(): WorkflowDefinition {
  return createEmptyWorkflowDefinition();
}

function triggerId(def: WorkflowDefinition): string {
  return def.nodes.find((n) => n.type === "trigger")!.id;
}

function baseForm(): FormDefinition {
  const form = createEmptyFormDefinition("Testformular");
  form.pages[0]!.fields = [
    { id: "fld_budget", key: "budget", label: "Budget", required: false, type: "number" },
  ];
  return form;
}

function makeContext(overrides: Partial<RunContext> = {}): RunContext {
  return {
    runId: "run_1",
    workflowId: "wf_1",
    formId: "form_1",
    responseId: "resp_1",
    isTest: false,
    dryRun: false,
    form: baseForm(),
    answers: {},
    rawAnswers: [],
    response: { id: "resp_1", submittedAt: new Date().toISOString() },
    workflow: { id: "wf_1", name: "Test-Workflow", webhookSecret: null },
    createdByUserId: "user_1",
    creatorEmail: "creator@example.com",
    workspaceId: "ws_1",
    ...overrides,
  };
}

function edge(source: string, target: string, sourceHandle: WorkflowEdge["sourceHandle"] = "out"): WorkflowEdge {
  return { id: generateWorkflowId("edge"), source, target, sourceHandle };
}

function actionNode(type: "responseAction", id = generateWorkflowId("node")): WorkflowNode {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    config: { action: "mark_read" },
  };
}

describe("runWorkflowGraph", () => {
  it("succeeds with no action nodes (trigger with no outgoing edge)", async () => {
    const def = baseWorkflow();
    const result = await runWorkflowGraph({
      nodes: def.nodes,
      edges: def.edges,
      ctx: makeContext(),
      registry: {},
    });
    expect(result.status).toBe("succeeded");
    expect(result.steps).toEqual([]);
  });

  it("executes a single action node via the registry", async () => {
    const def = baseWorkflow();
    const action = actionNode("responseAction");
    def.nodes.push(action);
    def.edges.push(edge(triggerId(def), action.id));

    const handler = vi.fn().mockResolvedValue({ output: { done: true } });
    const registry: ActionRegistry = { responseAction: handler };

    const result = await runWorkflowGraph({
      nodes: def.nodes,
      edges: def.edges,
      ctx: makeContext(),
      registry,
    });

    expect(result.status).toBe("succeeded");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(result.steps).toEqual([
      { nodeId: action.id, nodeType: "responseAction", status: "succeeded", output: { done: true } },
    ]);
  });

  it("follows the true branch when the condition matches", async () => {
    const def = baseWorkflow();
    const condition: WorkflowNode = {
      id: generateWorkflowId("node"),
      type: "condition",
      position: { x: 0, y: 0 },
      config: { logic: "and", rules: [{ fieldId: "fld_budget", operator: "greater_than", value: 1000 }] },
    };
    const trueAction = actionNode("responseAction");
    const falseAction = actionNode("responseAction");
    def.nodes.push(condition, trueAction, falseAction);
    def.edges.push(
      edge(triggerId(def), condition.id),
      edge(condition.id, trueAction.id, "true"),
      edge(condition.id, falseAction.id, "false"),
    );

    const trueHandler = vi.fn().mockResolvedValue({});
    const falseHandler = vi.fn().mockResolvedValue({});
    // Distinguish by wrapping — registry is keyed by type, so use call args to tell them apart.
    const registry: ActionRegistry = {
      responseAction: (node) => (node.id === trueAction.id ? trueHandler(node) : falseHandler(node)),
    };

    const result = await runWorkflowGraph({
      nodes: def.nodes,
      edges: def.edges,
      ctx: makeContext({ answers: { fld_budget: 5000 } }),
      registry,
    });

    expect(result.status).toBe("succeeded");
    expect(trueHandler).toHaveBeenCalledTimes(1);
    expect(falseHandler).not.toHaveBeenCalled();
    expect(result.steps.map((s) => s.nodeId)).toEqual([condition.id, trueAction.id]);
  });

  it("follows the false branch when the condition does not match", async () => {
    const def = baseWorkflow();
    const condition: WorkflowNode = {
      id: generateWorkflowId("node"),
      type: "condition",
      position: { x: 0, y: 0 },
      config: { logic: "and", rules: [{ fieldId: "fld_budget", operator: "greater_than", value: 1000 }] },
    };
    const falseAction = actionNode("responseAction");
    def.nodes.push(condition, falseAction);
    def.edges.push(
      edge(triggerId(def), condition.id),
      edge(condition.id, falseAction.id, "false"),
    );

    const handler = vi.fn().mockResolvedValue({});
    const result = await runWorkflowGraph({
      nodes: def.nodes,
      edges: def.edges,
      ctx: makeContext({ answers: { fld_budget: 100 } }),
      registry: { responseAction: handler },
    });

    expect(result.status).toBe("succeeded");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("ends the run successfully when the taken branch has no edge", async () => {
    const def = baseWorkflow();
    const condition: WorkflowNode = {
      id: generateWorkflowId("node"),
      type: "condition",
      position: { x: 0, y: 0 },
      config: { logic: "and", rules: [{ fieldId: "fld_budget", operator: "greater_than", value: 1000 }] },
    };
    def.nodes.push(condition);
    def.edges.push(edge(triggerId(def), condition.id));
    // No "true" or "false" edge at all.

    const result = await runWorkflowGraph({
      nodes: def.nodes,
      edges: def.edges,
      ctx: makeContext({ answers: { fld_budget: 5000 } }),
      registry: {},
    });
    expect(result.status).toBe("succeeded");
  });

  it("fails the run when an action handler throws", async () => {
    const def = baseWorkflow();
    const action = actionNode("responseAction");
    const after = actionNode("responseAction");
    def.nodes.push(action, after);
    def.edges.push(edge(triggerId(def), action.id), edge(action.id, after.id));

    const failingHandler = vi.fn().mockRejectedValue(new Error("Webhook 500"));
    const afterHandler = vi.fn().mockResolvedValue({});
    const registry: ActionRegistry = {
      responseAction: (node) => (node.id === action.id ? failingHandler() : afterHandler()),
    };

    const result = await runWorkflowGraph({
      nodes: def.nodes,
      edges: def.edges,
      ctx: makeContext(),
      registry,
    });

    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("ACTION_FAILED");
    expect(afterHandler).not.toHaveBeenCalled();
    expect(result.steps).toEqual([
      { nodeId: action.id, nodeType: "responseAction", status: "failed", errorMessage: "Webhook 500" },
    ]);
  });

  it("times out a slow action handler", async () => {
    const def = baseWorkflow();
    const action = actionNode("responseAction");
    def.nodes.push(action);
    def.edges.push(edge(triggerId(def), action.id));

    const slowHandler = () => new Promise<never>(() => {}); // never resolves
    const registry: ActionRegistry = { responseAction: slowHandler };

    vi.useFakeTimers();
    try {
      const resultPromise = runWorkflowGraph({
        nodes: def.nodes,
        edges: def.edges,
        ctx: makeContext(),
        registry,
      });
      await vi.advanceTimersByTimeAsync(11_000);
      const result = await resultPromise;
      expect(result.status).toBe("failed");
      expect(result.errorMessage).toContain("Zeitüberschreitung");
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops after the step limit to guard against undetected cycles", async () => {
    // Build a long chain (51 action nodes) exceeding MAX_STEPS=50.
    const def = baseWorkflow();
    let previousId = triggerId(def);
    for (let i = 0; i < 51; i++) {
      const node = actionNode("responseAction");
      def.nodes.push(node);
      def.edges.push(edge(previousId, node.id));
      previousId = node.id;
    }

    const handler = vi.fn().mockResolvedValue({});
    const result = await runWorkflowGraph({
      nodes: def.nodes,
      edges: def.edges,
      ctx: makeContext(),
      registry: { responseAction: handler },
    });

    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("STEP_LIMIT_EXCEEDED");
  });

  it("calls onStep for every executed step", async () => {
    const def = baseWorkflow();
    const action = actionNode("responseAction");
    def.nodes.push(action);
    def.edges.push(edge(triggerId(def), action.id));

    const onStep = vi.fn();
    await runWorkflowGraph({
      nodes: def.nodes,
      edges: def.edges,
      ctx: makeContext(),
      registry: { responseAction: vi.fn().mockResolvedValue({}) },
      onStep,
    });

    expect(onStep).toHaveBeenCalledTimes(1);
  });

  it("skips a node with no registered handler and continues", async () => {
    const def = baseWorkflow();
    const unhandled = actionNode("responseAction");
    const after = actionNode("responseAction");
    def.nodes.push(unhandled, after);
    def.edges.push(edge(triggerId(def), unhandled.id), edge(unhandled.id, after.id));

    const afterHandler = vi.fn().mockResolvedValue({});
    // Only handle the second node by identity check.
    const registry: ActionRegistry = {};
    const result = await runWorkflowGraph({
      nodes: def.nodes,
      edges: def.edges,
      ctx: makeContext(),
      registry,
    });

    expect(result.status).toBe("succeeded");
    expect(result.steps[0]!.status).toBe("skipped");
    expect(afterHandler).not.toHaveBeenCalled();
  });
});
