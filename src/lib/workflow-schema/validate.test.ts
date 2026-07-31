import { describe, expect, it } from "vitest";
import { createEmptyFormDefinition } from "@/lib/form-schema/factory";
import { generateId } from "@/lib/form-schema/ids";
import type { FormDefinition } from "@/lib/form-schema/schema";
import { createEmptyWorkflowDefinition } from "./factory";
import { generateWorkflowId } from "./ids";
import type { TriggerConfig } from "./nodes";
import type { WorkflowDefinition } from "./schema";
import { isWorkflowValid, validateWorkflowDefinition, type WorkflowFormRef } from "./validate";

const FORM_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_FORM_ID = "22222222-2222-4222-8222-222222222222";

function baseDef(formIds: string[] = [FORM_ID]): WorkflowDefinition {
  return createEmptyWorkflowDefinition(formIds);
}

function triggerId(def: WorkflowDefinition): string {
  return def.nodes.find((n) => n.type === "trigger")!.id;
}

function withTrigger(config: TriggerConfig): WorkflowDefinition {
  const def = createEmptyWorkflowDefinition();
  def.nodes[0]!.config = config as never;
  return def;
}

function formRef(
  id: string,
  title: string,
  fields: FormDefinition["pages"][0]["fields"] = [],
): WorkflowFormRef {
  const definition = createEmptyFormDefinition(title);
  definition.pages[0]!.fields = fields;
  return { id, title, definition };
}

describe("validateWorkflowDefinition — trigger", () => {
  it("passes for a definition with just a trigger and a selected form", () => {
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
      config: { event: "response_submitted", formIds: [FORM_ID] },
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

  it("errors when the trigger has no forms selected", () => {
    const def = baseDef([]);
    const result = validateWorkflowDefinition(def);
    expect(result.errors.some((e) => e.code === "TRIGGER_NO_FORMS")).toBe(true);
  });

  it("warns when the trigger references a form not in the provided set (e.g. deleted)", () => {
    const def = baseDef([FORM_ID]);
    const result = validateWorkflowDefinition(def, [formRef(OTHER_FORM_ID, "Anderes Formular")]);
    expect(result.warnings.some((w) => w.code === "TRIGGER_UNKNOWN_FORM")).toBe(true);
  });

  it("does not warn about unknown forms when the trigger form is in the provided set", () => {
    const def = baseDef([FORM_ID]);
    const result = validateWorkflowDefinition(def, [formRef(FORM_ID, "Mein Formular")]);
    expect(result.warnings.some((w) => w.code === "TRIGGER_UNKNOWN_FORM")).toBe(false);
  });
});

describe("validateWorkflowDefinition — graph structure", () => {
  it("errors on a cyclic graph", () => {
    const def = baseDef();
    const a = generateWorkflowId("node");
    const b = generateWorkflowId("node");
    def.nodes.push(
      {
        id: a,
        type: "responseAction",
        position: { x: 0, y: 100 },
        config: { action: "mark_read" },
      },
      {
        id: b,
        type: "responseAction",
        position: { x: 0, y: 200 },
        config: { action: "mark_read" },
      },
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
      {
        id: a,
        type: "responseAction",
        position: { x: 0, y: 100 },
        config: { action: "mark_read" },
      },
      {
        id: b,
        type: "responseAction",
        position: { x: 100, y: 100 },
        config: { action: "mark_read" },
      },
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
      {
        id: a,
        type: "responseAction",
        position: { x: -100, y: 200 },
        config: { action: "mark_read" },
      },
      {
        id: b,
        type: "responseAction",
        position: { x: 100, y: 200 },
        config: { action: "mark_read" },
      },
    );
    def.edges.push(
      {
        id: generateWorkflowId("edge"),
        source: triggerId(def),
        target: condition,
        sourceHandle: "out",
      },
      { id: generateWorkflowId("edge"), source: condition, target: a, sourceHandle: "true" },
      { id: generateWorkflowId("edge"), source: condition, target: b, sourceHandle: "false" },
    );
    const result = validateWorkflowDefinition(def);
    expect(result.errors).toEqual([]);
  });
});

describe("validateWorkflowDefinition — field references (single trigger form)", () => {
  function formWithField(): WorkflowFormRef {
    const budgetField = {
      id: generateId("field"),
      key: "budget",
      label: "Budget",
      required: false,
      type: "number" as const,
    };
    return formRef(FORM_ID, "Testformular", [budgetField]);
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
    const result = validateWorkflowDefinition(def, [formWithField()]);
    expect(result.warnings.some((w) => w.code === "CONDITION_REFERENCES_UNKNOWN_FIELD")).toBe(true);
  });

  it("does not warn when the condition references an existing field", () => {
    const form = formWithField();
    const def = baseDef();
    const condition = generateWorkflowId("node");
    def.nodes.push({
      id: condition,
      type: "condition",
      config: {
        logic: "and",
        rules: [{ fieldId: form.definition.pages[0]!.fields[0]!.id, operator: "is_answered" }],
      },
      position: { x: 0, y: 100 },
    });
    def.edges.push({
      id: generateWorkflowId("edge"),
      source: triggerId(def),
      target: condition,
      sourceHandle: "out",
    });
    const result = validateWorkflowDefinition(def, [form]);
    expect(result.warnings.some((w) => w.code === "CONDITION_REFERENCES_UNKNOWN_FIELD")).toBe(
      false,
    );
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
    const result = validateWorkflowDefinition(def, [formWithField()]);
    expect(result.warnings.some((w) => w.code === "EMAIL_REFERENCES_UNKNOWN_FIELD")).toBe(true);
  });

  it("skips field-reference checks when no forms are provided", () => {
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

describe("validateWorkflowDefinition — field references (multiple trigger forms)", () => {
  it("does not warn when a field exists in all trigger forms", () => {
    const budgetFieldA = {
      id: "fld_shared",
      key: "budget",
      label: "Budget",
      required: false,
      type: "number" as const,
    };
    const budgetFieldB = {
      id: "fld_shared",
      key: "budget",
      label: "Budget",
      required: false,
      type: "number" as const,
    };
    const formA = formRef(FORM_ID, "Formular A", [budgetFieldA]);
    const formB = formRef(OTHER_FORM_ID, "Formular B", [budgetFieldB]);

    const def = baseDef([FORM_ID, OTHER_FORM_ID]);
    const condition = generateWorkflowId("node");
    def.nodes.push({
      id: condition,
      type: "condition",
      position: { x: 0, y: 100 },
      config: { logic: "and", rules: [{ fieldId: "fld_shared", operator: "is_answered" }] },
    });
    def.edges.push({
      id: generateWorkflowId("edge"),
      source: triggerId(def),
      target: condition,
      sourceHandle: "out",
    });

    const result = validateWorkflowDefinition(def, [formA, formB]);
    expect(result.warnings.some((w) => w.code === "FIELD_NOT_IN_ALL_FORMS")).toBe(false);
    expect(result.warnings.some((w) => w.code === "CONDITION_REFERENCES_UNKNOWN_FIELD")).toBe(
      false,
    );
  });

  it("warns (not errors) when a field exists in some but not all trigger forms", () => {
    const budgetField = {
      id: "fld_only_in_a",
      key: "budget",
      label: "Budget",
      required: false,
      type: "number" as const,
    };
    const formA = formRef(FORM_ID, "Formular A", [budgetField]);
    const formB = formRef(OTHER_FORM_ID, "Formular B", []); // no matching field

    const def = baseDef([FORM_ID, OTHER_FORM_ID]);
    const condition = generateWorkflowId("node");
    def.nodes.push({
      id: condition,
      type: "condition",
      position: { x: 0, y: 100 },
      config: { logic: "and", rules: [{ fieldId: "fld_only_in_a", operator: "is_answered" }] },
    });
    def.edges.push({
      id: generateWorkflowId("edge"),
      source: triggerId(def),
      target: condition,
      sourceHandle: "out",
    });

    const result = validateWorkflowDefinition(def, [formA, formB]);
    expect(result.warnings.some((w) => w.code === "FIELD_NOT_IN_ALL_FORMS")).toBe(true);
    expect(result.errors.some((e) => e.code === "CONDITION_REFERENCES_UNKNOWN_FIELD")).toBe(false);
    expect(isWorkflowValid(result)).toBe(true); // still a warning, not an error
  });

  it("reports unknown-field (not partial) when the field exists in none of the trigger forms", () => {
    const formA = formRef(FORM_ID, "Formular A", []);
    const formB = formRef(OTHER_FORM_ID, "Formular B", []);

    const def = baseDef([FORM_ID, OTHER_FORM_ID]);
    const condition = generateWorkflowId("node");
    def.nodes.push({
      id: condition,
      type: "condition",
      position: { x: 0, y: 100 },
      config: { logic: "and", rules: [{ fieldId: "fld_nowhere", operator: "is_answered" }] },
    });
    def.edges.push({
      id: generateWorkflowId("edge"),
      source: triggerId(def),
      target: condition,
      sourceHandle: "out",
    });

    const result = validateWorkflowDefinition(def, [formA, formB]);
    expect(result.warnings.some((w) => w.code === "CONDITION_REFERENCES_UNKNOWN_FIELD")).toBe(true);
    expect(result.warnings.some((w) => w.code === "FIELD_NOT_IN_ALL_FORMS")).toBe(false);
  });

  it("only checks field references against forms the trigger actually selected", () => {
    // formB is in the provided set but NOT selected by the trigger — its field
    // absence must not produce a FIELD_NOT_IN_ALL_FORMS warning.
    const budgetField = {
      id: "fld_only_in_a",
      key: "budget",
      label: "Budget",
      required: false,
      type: "number" as const,
    };
    const formA = formRef(FORM_ID, "Formular A", [budgetField]);
    const formB = formRef(OTHER_FORM_ID, "Formular B", []);

    const def = baseDef([FORM_ID]); // only formA selected
    const condition = generateWorkflowId("node");
    def.nodes.push({
      id: condition,
      type: "condition",
      position: { x: 0, y: 100 },
      config: { logic: "and", rules: [{ fieldId: "fld_only_in_a", operator: "is_answered" }] },
    });
    def.edges.push({
      id: generateWorkflowId("edge"),
      source: triggerId(def),
      target: condition,
      sourceHandle: "out",
    });

    const result = validateWorkflowDefinition(def, [formA, formB]);
    expect(result.warnings.some((w) => w.code === "FIELD_NOT_IN_ALL_FORMS")).toBe(false);
  });
});

describe("validateWorkflowDefinition — non-response trigger types", () => {
  it("errors when a schedule trigger has no forms selected", () => {
    const def = withTrigger({ event: "schedule", frequency: "daily", time: "08:00", formIds: [] });
    const result = validateWorkflowDefinition(def);
    expect(result.errors.some((e) => e.code === "TRIGGER_NO_FORMS")).toBe(true);
  });

  it("errors when a scheduled_once trigger has no forms selected", () => {
    const def = withTrigger({
      event: "scheduled_once",
      runAt: "2099-01-01T00:00:00.000Z",
      formIds: [],
    });
    const result = validateWorkflowDefinition(def);
    expect(result.errors.some((e) => e.code === "TRIGGER_NO_FORMS")).toBe(true);
  });

  it("allows a webhook_inbound trigger with no forms when the workflow has no digest consumers", () => {
    const def = withTrigger({ event: "webhook_inbound", formIds: [] });
    const webhook = generateWorkflowId("node");
    def.nodes.push({
      id: webhook,
      type: "webhook",
      position: { x: 0, y: 100 },
      config: { url: "https://example.com/hook", includeAnswers: false },
    });
    def.edges.push({
      id: generateWorkflowId("edge"),
      source: triggerId(def),
      target: webhook,
      sourceHandle: "out",
    });
    const result = validateWorkflowDefinition(def);
    expect(isWorkflowValid(result)).toBe(true);
  });

  it("errors when a formless webhook_inbound trigger feeds a responseAction node", () => {
    const def = withTrigger({ event: "webhook_inbound", formIds: [] });
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
      sourceHandle: "out",
    });
    const result = validateWorkflowDefinition(def);
    expect(result.errors.some((e) => e.code === "TRIGGER_FORMS_REQUIRED_FOR_DIGEST")).toBe(true);
  });

  it("errors when a formless manual trigger uses an aiAction node", () => {
    const def = withTrigger({ event: "manual", formIds: [] });
    const ai = generateWorkflowId("node");
    def.nodes.push({
      id: ai,
      type: "aiAction",
      position: { x: 0, y: 100 },
      config: { task: "summarize" },
    });
    def.edges.push({
      id: generateWorkflowId("edge"),
      source: triggerId(def),
      target: ai,
      sourceHandle: "out",
    });
    const result = validateWorkflowDefinition(def);
    expect(result.errors.some((e) => e.code === "TRIGGER_FORMS_REQUIRED_FOR_DIGEST")).toBe(true);
  });

  it("errors when a formless webhook_inbound trigger uses {{digest:…}} in an email body", () => {
    const def = withTrigger({ event: "webhook_inbound", formIds: [] });
    const email = generateWorkflowId("node");
    def.nodes.push({
      id: email,
      type: "email",
      position: { x: 0, y: 100 },
      config: { to: "creator", subject: "Digest", body: "{{digest:list}}" },
    });
    def.edges.push({
      id: generateWorkflowId("edge"),
      source: triggerId(def),
      target: email,
      sourceHandle: "out",
    });
    const result = validateWorkflowDefinition(def);
    expect(result.errors.some((e) => e.code === "TRIGGER_FORMS_REQUIRED_FOR_DIGEST")).toBe(true);
  });

  it("errors when a weekly schedule has no weekday", () => {
    const def = withTrigger({
      event: "schedule",
      frequency: "weekly",
      time: "08:00",
      formIds: [FORM_ID],
    });
    const result = validateWorkflowDefinition(def);
    expect(result.errors.some((e) => e.code === "SCHEDULE_CONFIG_INVALID")).toBe(true);
  });

  it("errors when a monthly schedule has no dayOfMonth", () => {
    const def = withTrigger({
      event: "schedule",
      frequency: "monthly",
      time: "08:00",
      formIds: [FORM_ID],
    });
    const result = validateWorkflowDefinition(def);
    expect(result.errors.some((e) => e.code === "SCHEDULE_CONFIG_INVALID")).toBe(true);
  });

  it("passes for a fully specified weekly schedule", () => {
    const def = withTrigger({
      event: "schedule",
      frequency: "weekly",
      time: "08:00",
      weekday: 3,
      formIds: [FORM_ID],
    });
    const result = validateWorkflowDefinition(def);
    expect(isWorkflowValid(result)).toBe(true);
  });

  it("errors when scheduled_once's runAt is in the past", () => {
    const def = withTrigger({
      event: "scheduled_once",
      runAt: "2000-01-01T00:00:00.000Z",
      formIds: [FORM_ID],
    });
    const result = validateWorkflowDefinition(def);
    expect(result.errors.some((e) => e.code === "SCHEDULED_ONCE_IN_PAST")).toBe(true);
  });

  it("passes when scheduled_once's runAt is in the future", () => {
    const def = withTrigger({
      event: "scheduled_once",
      runAt: "2099-01-01T00:00:00.000Z",
      formIds: [FORM_ID],
    });
    const result = validateWorkflowDefinition(def);
    expect(isWorkflowValid(result)).toBe(true);
  });
});

describe("validateWorkflowDefinition — trigger/action compatibility", () => {
  it("errors on a condition node when the trigger is not response_submitted", () => {
    const def = withTrigger({ event: "manual", formIds: [FORM_ID] });
    const condition = generateWorkflowId("node");
    def.nodes.push({
      id: condition,
      type: "condition",
      position: { x: 0, y: 100 },
      config: { logic: "and", rules: [{ fieldId: "fld_x", operator: "is_answered" }] },
    });
    def.edges.push({
      id: generateWorkflowId("edge"),
      source: triggerId(def),
      target: condition,
      sourceHandle: "out",
    });
    const result = validateWorkflowDefinition(def);
    expect(result.errors.some((e) => e.code === "CONDITION_UNSUPPORTED_FOR_TRIGGER")).toBe(true);
  });

  it("does not flag a condition node under a response_submitted trigger", () => {
    const def = baseDef();
    const condition = generateWorkflowId("node");
    def.nodes.push({
      id: condition,
      type: "condition",
      position: { x: 0, y: 100 },
      config: { logic: "and", rules: [{ fieldId: "fld_x", operator: "is_answered" }] },
    });
    def.edges.push({
      id: generateWorkflowId("edge"),
      source: triggerId(def),
      target: condition,
      sourceHandle: "out",
    });
    const result = validateWorkflowDefinition(def);
    expect(result.errors.some((e) => e.code === "CONDITION_UNSUPPORTED_FOR_TRIGGER")).toBe(false);
  });

  it("errors when an email uses submitter_field under a schedule trigger", () => {
    const def = withTrigger({
      event: "schedule",
      frequency: "daily",
      time: "08:00",
      formIds: [FORM_ID],
    });
    const email = generateWorkflowId("node");
    def.nodes.push({
      id: email,
      type: "email",
      position: { x: 0, y: 100 },
      config: { to: "submitter_field", submitterFieldId: "fld_email", subject: "Hi", body: "Hi" },
    });
    def.edges.push({
      id: generateWorkflowId("edge"),
      source: triggerId(def),
      target: email,
      sourceHandle: "out",
    });
    const result = validateWorkflowDefinition(def);
    expect(result.errors.some((e) => e.code === "EMAIL_RECIPIENT_UNSUPPORTED_FOR_TRIGGER")).toBe(
      true,
    );
  });

  it("errors when an aiAction uses classify under a webhook_inbound trigger", () => {
    const def = withTrigger({ event: "webhook_inbound", formIds: [FORM_ID] });
    const ai = generateWorkflowId("node");
    def.nodes.push({
      id: ai,
      type: "aiAction",
      position: { x: 0, y: 100 },
      config: { task: "classify", categories: ["a", "b"] },
    });
    def.edges.push({
      id: generateWorkflowId("edge"),
      source: triggerId(def),
      target: ai,
      sourceHandle: "out",
    });
    const result = validateWorkflowDefinition(def);
    expect(result.errors.some((e) => e.code === "AI_TASK_UNSUPPORTED_FOR_TRIGGER")).toBe(true);
  });

  it("does not flag an aiAction summarize task under a manual trigger", () => {
    const def = withTrigger({ event: "manual", formIds: [FORM_ID] });
    const ai = generateWorkflowId("node");
    def.nodes.push({
      id: ai,
      type: "aiAction",
      position: { x: 0, y: 100 },
      config: { task: "summarize" },
    });
    def.edges.push({
      id: generateWorkflowId("edge"),
      source: triggerId(def),
      target: ai,
      sourceHandle: "out",
    });
    const result = validateWorkflowDefinition(def);
    expect(result.errors.some((e) => e.code === "AI_TASK_UNSUPPORTED_FOR_TRIGGER")).toBe(false);
  });
});

describe("validateWorkflowDefinition — placeholder compatibility", () => {
  it("warns when an email uses {{field:…}} under a manual trigger", () => {
    const def = withTrigger({ event: "manual", formIds: [FORM_ID] });
    const email = generateWorkflowId("node");
    def.nodes.push({
      id: email,
      type: "email",
      position: { x: 0, y: 100 },
      config: { to: "creator", subject: "Hi {{field:fld_x}}", body: "Body" },
    });
    def.edges.push({
      id: generateWorkflowId("edge"),
      source: triggerId(def),
      target: email,
      sourceHandle: "out",
    });
    const result = validateWorkflowDefinition(def);
    expect(result.warnings.some((w) => w.code === "PLACEHOLDER_UNSUPPORTED_FOR_TRIGGER")).toBe(
      true,
    );
  });

  it("warns when an email uses {{digest:…}} under a response_submitted trigger", () => {
    const def = baseDef();
    const email = generateWorkflowId("node");
    def.nodes.push({
      id: email,
      type: "email",
      position: { x: 0, y: 100 },
      config: { to: "creator", subject: "Digest", body: "{{digest:count}}" },
    });
    def.edges.push({
      id: generateWorkflowId("edge"),
      source: triggerId(def),
      target: email,
      sourceHandle: "out",
    });
    const result = validateWorkflowDefinition(def);
    expect(result.warnings.some((w) => w.code === "PLACEHOLDER_UNSUPPORTED_FOR_TRIGGER")).toBe(
      true,
    );
  });

  it("warns when a responseAction note uses {{payload:json}} under a schedule trigger", () => {
    const def = withTrigger({
      event: "schedule",
      frequency: "daily",
      time: "08:00",
      formIds: [FORM_ID],
    });
    const action = generateWorkflowId("node");
    def.nodes.push({
      id: action,
      type: "responseAction",
      position: { x: 0, y: 100 },
      config: { action: "append_note", noteText: "{{payload:json}}" },
    });
    def.edges.push({
      id: generateWorkflowId("edge"),
      source: triggerId(def),
      target: action,
      sourceHandle: "out",
    });
    const result = validateWorkflowDefinition(def);
    expect(result.warnings.some((w) => w.code === "PLACEHOLDER_UNSUPPORTED_FOR_TRIGGER")).toBe(
      true,
    );
  });

  it("does not warn about {{payload:json}} under a webhook_inbound trigger", () => {
    const def = withTrigger({ event: "webhook_inbound", formIds: [FORM_ID] });
    const action = generateWorkflowId("node");
    def.nodes.push({
      id: action,
      type: "responseAction",
      position: { x: 0, y: 100 },
      config: { action: "append_note", noteText: "{{payload:json}}" },
    });
    def.edges.push({
      id: generateWorkflowId("edge"),
      source: triggerId(def),
      target: action,
      sourceHandle: "out",
    });
    const result = validateWorkflowDefinition(def);
    expect(result.warnings.some((w) => w.code === "PLACEHOLDER_UNSUPPORTED_FOR_TRIGGER")).toBe(
      false,
    );
  });

  it("does not warn about {{field:…}}/{{response:…}} under a response_submitted trigger", () => {
    const def = baseDef();
    const email = generateWorkflowId("node");
    def.nodes.push({
      id: email,
      type: "email",
      position: { x: 0, y: 100 },
      config: { to: "creator", subject: "Hi {{field:fld_x}}", body: "{{response:all}}" },
    });
    def.edges.push({
      id: generateWorkflowId("edge"),
      source: triggerId(def),
      target: email,
      sourceHandle: "out",
    });
    const result = validateWorkflowDefinition(def);
    expect(result.warnings.some((w) => w.code === "PLACEHOLDER_UNSUPPORTED_FOR_TRIGGER")).toBe(
      false,
    );
  });
});
