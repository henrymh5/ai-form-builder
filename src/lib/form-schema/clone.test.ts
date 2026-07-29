import { describe, expect, it } from "vitest";
import { cloneFieldWithNewIds, cloneFormDefinition, clonePageWithNewIds } from "./clone";
import { createEmptyFormDefinition } from "./factory";
import { generateId } from "./ids";
import type { FormDefinition } from "./schema";

function buildFormWithCondition(): FormDefinition {
  const def = createEmptyFormDefinition("Budget-Formular");
  const budgetFieldId = generateId("field");
  const secondPageId = generateId("page");
  const smallProjectEndingId = generateId("ending");

  def.pages[0]!.id = def.pages[0]!.id; // keep first page as-is
  def.pages[0]!.fields = [
    {
      id: budgetFieldId,
      key: "budget",
      label: "Budget",
      required: true,
      type: "single_choice",
      options: [
        { id: generateId("option"), label: "Unter 2000 €", value: "small" },
        { id: generateId("option"), label: "Über 10000 €", value: "large" },
      ],
    },
  ];
  def.pages.push({ id: secondPageId, title: "Kleines Projekt", fields: [] });
  def.endings.push({
    id: smallProjectEndingId,
    title: "Danke, kleines Projekt!",
    isDefault: false,
  });

  def.conditions = [
    {
      id: generateId("condition"),
      logic: "and",
      rules: [{ fieldId: budgetFieldId, operator: "equals", value: "small" }],
      action: "jump_to_page",
      targetId: secondPageId,
    },
    {
      id: generateId("condition"),
      logic: "and",
      rules: [{ fieldId: budgetFieldId, operator: "equals", value: "small" }],
      action: "end_form",
      targetId: smallProjectEndingId,
    },
  ];

  return def;
}

describe("cloneFormDefinition", () => {
  it("assigns fresh IDs to every page, field, option, and ending", () => {
    const original = buildFormWithCondition();
    const clone = cloneFormDefinition(original);

    expect(clone.pages[0]!.id).not.toBe(original.pages[0]!.id);
    expect(clone.pages[1]!.id).not.toBe(original.pages[1]!.id);
    expect(clone.pages[0]!.fields[0]!.id).not.toBe(original.pages[0]!.fields[0]!.id);
    expect(clone.endings.map((e) => e.id)).not.toEqual(original.endings.map((e) => e.id));
  });

  it("rewrites condition rule field references to the new field IDs", () => {
    const original = buildFormWithCondition();
    const clone = cloneFormDefinition(original);

    const newBudgetFieldId = clone.pages[0]!.fields[0]!.id;
    for (const condition of clone.conditions) {
      for (const rule of condition.rules) {
        expect(rule.fieldId).toBe(newBudgetFieldId);
        // must not accidentally still point at the original ID
        expect(rule.fieldId).not.toBe(original.conditions[0]!.rules[0]!.fieldId);
      }
    }
  });

  it("rewrites jump_to_page and end_form targetId references", () => {
    const original = buildFormWithCondition();
    const clone = cloneFormDefinition(original);

    const jumpCondition = clone.conditions.find((c) => c.action === "jump_to_page")!;
    expect(jumpCondition.targetId).toBe(clone.pages[1]!.id);

    const endCondition = clone.conditions.find((c) => c.action === "end_form")!;
    expect(endCondition.targetId).toBe(clone.endings[1]!.id);
  });

  it("produces a definition that still parses against the schema", async () => {
    const { formDefinitionSchema } = await import("./schema");
    const clone = cloneFormDefinition(buildFormWithCondition());
    expect(formDefinitionSchema.safeParse(clone).success).toBe(true);
  });
});

describe("clonePageWithNewIds", () => {
  it("assigns new IDs to the page and its fields, dropping no data", () => {
    const original = buildFormWithCondition();
    const page = original.pages[0]!;
    const cloned = clonePageWithNewIds(page);

    expect(cloned.id).not.toBe(page.id);
    expect(cloned.fields[0]!.id).not.toBe(page.fields[0]!.id);
    expect(cloned.fields).toHaveLength(page.fields.length);
  });
});

describe("cloneFieldWithNewIds", () => {
  it("assigns a new field ID and new option IDs", () => {
    const original = buildFormWithCondition();
    const field = original.pages[0]!.fields[0]!;
    const cloned = cloneFieldWithNewIds(field);

    expect(cloned.id).not.toBe(field.id);
    if ("options" in cloned && "options" in field) {
      expect(cloned.options.map((o) => o.id)).not.toEqual(field.options.map((o) => o.id));
      expect(cloned.options.map((o) => o.value)).toEqual(field.options.map((o) => o.value));
    }
  });
});
