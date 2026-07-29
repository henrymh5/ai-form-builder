import { describe, expect, it } from "vitest";
import { createEmptyFormDefinition } from "@/lib/form-schema/factory";
import { generateId } from "@/lib/form-schema/ids";
import type { FormDefinition } from "@/lib/form-schema/schema";
import { createEmptyWorkflowDefinition } from "./factory";
import { generateWorkflowId } from "./ids";
import type { WorkflowDefinition } from "./schema";
import { isWorkflowValid, validateWorkflowDefinition } from "./validate";

function baseDef(): WorkflowDefinition {
  return createEmptyWorkflowDefinition();
}

function triggerId(def: WorkflowDefinition): string {
  return def.nodes.find((n) => n.type === "trigger")!.id;
}

describe("validateWorkflowDefinition — trigger", () => {
  it("passes for a definition with just a trigger", () => {
    const result = validateWorkflowDefinition(baseDef());
    expect(isWorkflowValid(result)).toBe(true);
  });

  it("errors when there is no trigger", () => {
    const def = baseDef();
    def.nodes = [];
    // min(1) on schema would already reject this, but validate() should be defensive too.
    const result = validateWorkflowDefinition(def);
    expect(result.errors.some((e) => e.code === "NO_TRIGGER")).toBe(true);
  });

  it("errors on multiple triggers", () => {
    const def = baseDef();
    def.nodes.push({
      id: generateWorkflowId("node"),
      type: "trigger",
      position: { x: 100, y: 0 },
      config: { event: "response_submitted" },
    });
    const result = validateWorkflowDefinition(def);
    expect(result.errors.some((e) => e.code === "MULTIPLE_TRIGGERS")).toBe(true);
  });

  it("errors when the trigger has an incoming edge", () => {
    const def = baseDef();
    const noteNodeId = generateWorkflowId("node");
    def.nodes.push({
      id: noteNodeId,
      type: "responseAction",
      position: { x: 0, y: 100 },
      config: { action: "mark_read" },
    });
    def.edges.push({
      id: generateWorkflowId("edge"),
      source: noteNodeId,
      target: triggerId(def),
      sourceHandle: "out",
    });
    const result = validateWorkflowDefinition(def);
    expect(result.errors.some((e) => e.code === "TRIGGER_HAS_INCOMING_EDGE")).toBe(true);
  });
});

describe("validateWorkflowDefinition — graph structure", () => {
  it("errors on a cyclic graph", () => {
    const def = baseDef();
    const a = generateWorkflowId("node");
    const b = generateWorkflowId("node");
    def.nodes.push(
      { id: a, type: "responseAction", position: { x: 0, y: 100 }, config: { action: "mark_read" } },
      { id: b, type: "responseAction", position: { x: 0, y: 200 }, config: { action: "mark_read" } },
    );
    def.edges.push(
      { id: generateWorkflowId("edge"), source: triggerId(def), target: a, sourceHandle: "out" },
      { id: generateWorkflowId("edge"), source: a, target: b, sourceHandle: "out" },
      { id: generateWorkflowId("edge"), source: b, target: a, sourceHandle: "out" },
    );
    const result = validateWorkflowDefinition(def);
    expect(result.errors.some((e) => e.code === "CYCLIC_GRAPH")).toBe(true);
  });

  it("warns about a node unreachable from the trigger", () => {
    const def = baseDef();
    const orphan = generateWorkflowId("node");
    def.nodes.push({
      id: orphan,
      type: "responseAction",
      position: { x: 300, y: 300 },
      config: { action: "mark_read" },
    });
    const result = validateWorkflowDefinition(def);
    expect(result.warnings.some((w) => w.code === "UNREACHABLE_NODE" && w.nodeId === orphan)).toBe(
      true,
    );
  });

  it("errors on duplicate node IDs", () => {
    const def = baseDef();
    const dupId = triggerId(def);
    def.nodes.push({
      id: dupId,
      type: "responseAction",
      position: { x: 0, y: 100 },
      config: { action: "mark_read" },
    });
    const result = validateWorkflowDefinition(def);
    expect(result.errors.some((e) => e.code === "DUPLICATE_NODE_ID")).toBe(true);
  });

  it("errors when an edge references an unknown node", () => {
    const def = baseDef();
    def.edges.push({
      id: generateWorkflowId("edge"),
      source: triggerId(def),
      target: "wfn_doesnotexist",
      sourceHandle: "out",
    });
    const result = validateWorkflowDefinition(def);
    expect(result.errors.some((e) => e.code === "EDGE_UNKNOWN_NODE")).toBe(true);
  });

  it("errors when a non-condition node uses the true/false handle", () => {
    const def = baseDef();
    const action = generateWorkflowId("node");
    def.nodes.push({
      id: action,
      type: "responseAction",
      position: { x: 0, y: 100 },
      config: { action: "mark_read" },
    });
    def.edges.push({
      id: generateWorkflowId("edge"),
      source: triggerId(def),
      target: action,
      sourceHandle: "true",
    });
    const result = validateWorkflowDefinition(def);
    expect(result.errors.some((e) => e.code === "EDGE_INVALID_HANDLE")).toBe(true);
  });

  it("errors when a handle already has an outgoing edge", () => {
    const def = baseDef();
    const a = generateWorkflowId("node");
    const b = generateWorkflowId("node");
    def.nodes.push(
      { id: a, type: "responseAction", position: { x: 0, y: 100 }, config: { action: "mark_read" } },
      { id: b, type: "responseAction", position: { x: 100, y: 100 }, config: { action: "mark_read" } },
    );
    def.edges.push(
      { id: generateWorkflowId("edge"), source: triggerId(def), target: a, sourceHandle: "out" },
      { id: generateWorkflowId("edge"), source: triggerId(def), target: b, sourceHandle: "out" },
    );
    const result = validateWorkflowDefinition(def);
    expect(result.errors.some((e) => e.code === "EDGE_HANDLE_ALREADY_USED")).toBe(true);
  });

  it("allows a condition node to have both a true and a false edge", () => {
    const def = baseDef();
    const condition = generateWorkflowId("node");
    const a = generateWorkflowId("node");
    const b = generateWorkflowId("node");
    def.nodes.push(
      {
        id: condition,
        type: "condition",
        position: { x: 0, y: 100 },
        config: { logic: "and", rules: [{ fieldId: "fld_x", operator: "is_answered" }] },
      },
      { id: a, type: "responseAction", position: { x: -100, y: 200 }, config: { action: "mark_read" } },
      { id: b, type: "responseAction", position: { x: 100, y: 200 }, config: { action: "mark_read" } },
    );
    def.edges.push(
      { id: generateWorkflowId("edge"), source: triggerId(def), target: condition, sourceHandle: "out" },
      { id: generateWorkflowId("edge"), source: condition, target: a, sourceHandle: "true" },
      { id: generateWorkflowId("edge"), source: condition, target: b, sourceHandle: "false" },
    );
    const result = validateWorkflowDefinition(def);
    expect(result.errors).toEqual([]);
  });
});

describe("validateWorkflowDefinition — field references", () => {
  function formWithField(): FormDefinition {
    const form = createEmptyFormDefinition("Testformular");
    form.pages[0]!.fields = [
      { id: generateId("field"), key: "budget", label: "Budget", required: false, type: "number" },
    ];
    return form;
  }

  it("warns when a condition references an unknown field", () => {
    const def = baseDef();
    const condition = generateWorkflowId("node");
    def.nodes.push({
      id: condition,
      type: "condition",
      position: { x: 0, y: 100 },
      config: { logic: "and", rules: [{ fieldId: "fld_unknown", operator: "is_answered" }] },
    });
    def.edges.push({
      id: generateWorkflowId("edge"),
      source: triggerId(def),
      target: condition,
      sourceHandle: "out",
    });
    const result = validateWorkflowDefinition(def, formWithField());
    expect(
      result.warnings.some((w) => w.code === "CONDITION_REFERENCES_UNKNOWN_FIELD"),
    ).toBe(true);
  });

  it("does not warn when the condition references an existing field", () => {
    const form = formWithField();
    const def = baseDef();
    const condition = generateWorkflowId("node");
    def.nodes.push({
      id: condition,
      type: "condition",
      config: { logic: "and", rules: [{ fieldId: form.pages[0]!.fields[0]!.id, operator: "is_answered" }] },
      position: { x: 0, y: 100 },
    });
    def.edges.push({
      id: generateWorkflowId("edge"),
      source: triggerId(def),
      target: condition,
      sourceHandle: "out",
    });
    const result = validateWorkflowDefinition(def, form);
    expect(
      result.warnings.some((w) => w.code === "CONDITION_REFERENCES_UNKNOWN_FIELD"),
    ).toBe(false);
  });

  it("warns when an email placeholder references an unknown field", () => {
    const def = baseDef();
    const email = generateWorkflowId("node");
    def.nodes.push({
      id: email,
      type: "email",
      position: { x: 0, y: 100 },
      config: {
        to: "creator",
        subject: "Neue Antwort",
        body: "Budget: {{field:fld_unknown}}",
      },
    });
    def.edges.push({
      id: generateWorkflowId("edge"),
      source: triggerId(def),
      target: email,
      sourceHandle: "out",
    });
    const result = validateWorkflowDefinition(def, formWithField());
    expect(result.warnings.some((w) => w.code === "EMAIL_REFERENCES_UNKNOWN_FIELD")).toBe(true);
  });

  it("skips field-reference checks when no form is provided", () => {
    const def = baseDef();
    const condition = generateWorkflowId("node");
    def.nodes.push({
      id: condition,
      type: "condition",
      position: { x: 0, y: 100 },
      config: { logic: "and", rules: [{ fieldId: "fld_unknown", operator: "is_answered" }] },
    });
    def.edges.push({
      id: generateWorkflowId("edge"),
      source: triggerId(def),
      target: condition,
      sourceHandle: "out",
    });
    const result = validateWorkflowDefinition(def);
    expect(result.warnings).toEqual([]);
  });
});
