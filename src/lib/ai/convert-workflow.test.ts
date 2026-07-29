import { describe, expect, it } from "vitest";
import { createEmptyFormDefinition } from "@/lib/form-schema/factory";
import { generateId } from "@/lib/form-schema/ids";
import type { FormDefinition } from "@/lib/form-schema/schema";
import { workflowDefinitionSchema } from "@/lib/workflow-schema/schema";
import { isWorkflowValid, validateWorkflowDefinition } from "@/lib/workflow-schema/validate";
import { AppError } from "@/lib/errors";
import { toWorkflowDefinition } from "./convert-workflow";
import type { GenerateWorkflowOutput } from "./workflow-schemas";

function formWithFields(): FormDefinition {
  const form = createEmptyFormDefinition("Testformular");
  form.pages[0]!.fields = [
    { id: generateId("field"), key: "budget", label: "Budget", required: false, type: "number" },
    { id: generateId("field"), key: "email", label: "E-Mail-Adresse", required: true, type: "email" },
  ];
  return form;
}

describe("toWorkflowDefinition", () => {
  it("produces a schema-valid WorkflowDefinition with a trigger + resolved nodes", () => {
    const form = formWithFields();
    const output: GenerateWorkflowOutput = {
      name: "Budget-Benachrichtigung",
      nodes: [
        {
          ref: "n1",
          type: "condition",
          logic: "and",
          rules: [{ fieldLabel: "Budget", operator: "greater_than", value: "1000" }],
        },
        {
          ref: "n2",
          type: "email",
          to: "submitter_field",
          submitterFieldLabel: "E-Mail-Adresse",
          subject: "Danke für deine Anfrage",
          body: "Wir melden uns bald.",
        },
      ],
      edges: [{ from: "n1", to: "n2", branch: "true" }],
    };

    const definition = toWorkflowDefinition(output, form);
    const parsed = workflowDefinitionSchema.safeParse(definition);
    expect(parsed.success).toBe(true);

    expect(definition.nodes).toHaveLength(3); // trigger + 2 AI nodes
    const trigger = definition.nodes.find((n) => n.type === "trigger")!;
    const condition = definition.nodes.find((n) => n.type === "condition")!;
    const email = definition.nodes.find((n) => n.type === "email")!;

    // Field labels resolved to real field IDs.
    expect(condition.type).toBe("condition");
    if (condition.type === "condition") {
      expect(condition.config.rules[0]!.fieldId).toBe(form.pages[0]!.fields[0]!.id);
    }
    expect(email.type).toBe("email");
    if (email.type === "email") {
      expect(email.config.submitterFieldId).toBe(form.pages[0]!.fields[1]!.id);
    }

    // Trigger connects to the first node with no incoming edge (the condition).
    expect(definition.edges.some((e) => e.source === trigger.id && e.target === condition.id)).toBe(
      true,
    );
    // Condition's true-branch edge connects to the email node.
    expect(
      definition.edges.some(
        (e) => e.source === condition.id && e.target === email.id && e.sourceHandle === "true",
      ),
    ).toBe(true);
  });

  it("assigns unique, real IDs — never reusing the AI's local refs", () => {
    const form = formWithFields();
    const output: GenerateWorkflowOutput = {
      name: "Test",
      nodes: [{ ref: "n1", type: "responseAction", action: "mark_read" }],
      edges: [],
    };
    const definition = toWorkflowDefinition(output, form);
    const actionNode = definition.nodes.find((n) => n.type === "responseAction")!;
    expect(actionNode.id).not.toBe("n1");
    expect(actionNode.id.startsWith("wfn_")).toBe(true);
  });

  it("assigns a non-zero auto-layout position to every node", () => {
    const form = formWithFields();
    const output: GenerateWorkflowOutput = {
      name: "Test",
      nodes: [
        { ref: "n1", type: "responseAction", action: "mark_read" },
        { ref: "n2", type: "responseAction", action: "set_status", status: "spam" },
      ],
      edges: [{ from: "n1", to: "n2" }],
    };
    const definition = toWorkflowDefinition(output, form);
    // The second node should be laid out below the first (top-down dagre layout).
    const [first, second] = definition.nodes
      .filter((n) => n.type === "responseAction")
      .sort((a, b) => a.position.y - b.position.y);
    expect(second!.position.y).toBeGreaterThan(first!.position.y);
  });

  it("throws AI_INVALID_OUTPUT when a rule references an unknown field label", () => {
    const form = formWithFields();
    const output: GenerateWorkflowOutput = {
      name: "Test",
      nodes: [
        {
          ref: "n1",
          type: "condition",
          logic: "and",
          rules: [{ fieldLabel: "Nicht existierendes Feld", operator: "is_answered" }],
        },
      ],
      edges: [],
    };
    expect(() => toWorkflowDefinition(output, form)).toThrow(AppError);
  });

  it("throws AI_INVALID_OUTPUT when an email submitter field label is unknown", () => {
    const form = formWithFields();
    const output: GenerateWorkflowOutput = {
      name: "Test",
      nodes: [
        {
          ref: "n1",
          type: "email",
          to: "submitter_field",
          submitterFieldLabel: "Unbekanntes Feld",
          subject: "Hallo",
          body: "Text",
        },
      ],
      edges: [],
    };
    expect(() => toWorkflowDefinition(output, form)).toThrow(AppError);
  });

  it("passes domain validation with no errors for a well-formed generated workflow", () => {
    const form = formWithFields();
    const output: GenerateWorkflowOutput = {
      name: "Test",
      nodes: [{ ref: "n1", type: "responseAction", action: "mark_read" }],
      edges: [],
    };
    const definition = toWorkflowDefinition(output, form);
    const result = validateWorkflowDefinition(definition, form);
    expect(isWorkflowValid(result)).toBe(true);
  });
});
