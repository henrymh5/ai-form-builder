import { describe, expect, it } from "vitest";
import { createEmptyFormDefinition } from "./factory";
import { generateId } from "./ids";
import type { Field, FormDefinition } from "./schema";
import { isValid, validateFormDefinition } from "./validate";

function baseDef(): FormDefinition {
  return createEmptyFormDefinition("Testformular");
}

describe("validateFormDefinition — limits", () => {
  it("passes for a form within all limits", () => {
    const result = validateFormDefinition(baseDef());
    expect(isValid(result)).toBe(true);
  });

  it("errors when a field's options exceed the per-field maximum", () => {
    const def = baseDef();
    def.pages[0]!.fields = [
      {
        id: generateId("field"),
        key: "choice",
        label: "Auswahl",
        required: false,
        type: "single_choice",
        options: Array.from({ length: 21 }, (_, i) => ({
          id: generateId("option"),
          label: `Option ${i}`,
          value: `v${i}`,
        })),
      },
    ];
    const result = validateFormDefinition(def);
    expect(result.errors.some((e) => e.code === "TOO_MANY_OPTIONS")).toBe(true);
  });

  it("errors when total field count exceeds the maximum", () => {
    const def = baseDef();
    def.pages[0]!.fields = Array.from({ length: 51 }, (_, i) => ({
      id: generateId("field"),
      key: `f${i}`,
      label: `Feld ${i}`,
      required: false,
      type: "short_text" as const,
    }));
    const result = validateFormDefinition(def);
    expect(result.errors.some((e) => e.code === "TOO_MANY_FIELDS")).toBe(true);
  });
});

describe("validateFormDefinition — uniqueness", () => {
  it("errors on duplicate field IDs", () => {
    const def = baseDef();
    const dupId = generateId("field");
    const field: Field = { id: dupId, key: "a", label: "A", required: false, type: "short_text" };
    const field2: Field = { id: dupId, key: "b", label: "B", required: false, type: "short_text" };
    def.pages[0]!.fields = [field, field2];
    const result = validateFormDefinition(def);
    expect(result.errors.some((e) => e.code === "DUPLICATE_FIELD_ID")).toBe(true);
  });

  it("errors on duplicate field keys across different fields", () => {
    const def = baseDef();
    def.pages[0]!.fields = [
      { id: generateId("field"), key: "same", label: "A", required: false, type: "short_text" },
      { id: generateId("field"), key: "same", label: "B", required: false, type: "short_text" },
    ];
    const result = validateFormDefinition(def);
    expect(result.errors.some((e) => e.code === "DUPLICATE_FIELD_KEY")).toBe(true);
  });

  it("passes when field keys are all unique", () => {
    const def = baseDef();
    def.pages[0]!.fields = [
      { id: generateId("field"), key: "a", label: "A", required: false, type: "short_text" },
      { id: generateId("field"), key: "b", label: "B", required: false, type: "short_text" },
    ];
    const result = validateFormDefinition(def);
    expect(result.errors.some((e) => e.code === "DUPLICATE_FIELD_KEY")).toBe(false);
  });

  it("errors on duplicate option values within one field", () => {
    const def = baseDef();
    def.pages[0]!.fields = [
      {
        id: generateId("field"),
        key: "choice",
        label: "Auswahl",
        required: false,
        type: "single_choice",
        options: [
          { id: generateId("option"), label: "A", value: "same" },
          { id: generateId("option"), label: "B", value: "same" },
        ],
      },
    ];
    const result = validateFormDefinition(def);
    expect(result.errors.some((e) => e.code === "DUPLICATE_OPTION_VALUE")).toBe(true);
  });
});

describe("validateFormDefinition — default ending", () => {
  it("errors when no ending is marked as default", () => {
    const def = baseDef();
    def.endings = [{ id: generateId("ending"), title: "Danke", isDefault: false }];
    const result = validateFormDefinition(def);
    expect(result.errors.some((e) => e.code === "MISSING_DEFAULT_ENDING")).toBe(true);
  });

  it("errors when more than one ending is marked as default", () => {
    const def = baseDef();
    def.endings = [
      { id: generateId("ending"), title: "Danke A", isDefault: true },
      { id: generateId("ending"), title: "Danke B", isDefault: true },
    ];
    const result = validateFormDefinition(def);
    expect(result.errors.some((e) => e.code === "MULTIPLE_DEFAULT_ENDINGS")).toBe(true);
  });

  it("passes with exactly one default ending", () => {
    const result = validateFormDefinition(baseDef());
    expect(result.errors.some((e) => e.code === "MISSING_DEFAULT_ENDING")).toBe(false);
    expect(result.errors.some((e) => e.code === "MULTIPLE_DEFAULT_ENDINGS")).toBe(false);
  });
});

describe("validateFormDefinition — reference checks", () => {
  it("errors when a condition rule references a deleted field", () => {
    const def = baseDef();
    def.conditions = [
      {
        id: generateId("condition"),
        logic: "and",
        rules: [{ fieldId: "fld_doesnotexist", operator: "is_answered" }],
        action: "end_form",
        targetId: def.endings[0]!.id,
      },
    ];
    const result = validateFormDefinition(def);
    expect(result.errors.some((e) => e.code === "CONDITION_REFERENCES_UNKNOWN_FIELD")).toBe(true);
  });

  it("errors when a condition target does not exist at all", () => {
    const def = baseDef();
    def.conditions = [
      {
        id: generateId("condition"),
        logic: "and",
        rules: [{ fieldId: def.pages[0]!.id, operator: "is_answered" }], // dummy, will also flag unknown field
        action: "jump_to_page",
        targetId: "pg_doesnotexist",
      },
    ];
    const result = validateFormDefinition(def);
    expect(result.errors.some((e) => e.code === "CONDITION_REFERENCES_UNKNOWN_TARGET")).toBe(true);
  });

  it("errors when a condition target exists but is the wrong entity kind", () => {
    const def = baseDef();
    const secondPageId = generateId("page");
    def.pages.push({ id: secondPageId, fields: [] });
    def.conditions = [
      {
        id: generateId("condition"),
        logic: "and",
        rules: [],
        action: "end_form",
        // targetId points at a page, but end_form expects an ending
        targetId: secondPageId,
      },
    ];
    // rules: [] would fail min(1) at the zod layer in real usage; use a valid rule
    def.conditions[0]!.rules = [{ fieldId: secondPageId, operator: "is_answered" }];
    const result = validateFormDefinition(def);
    expect(result.errors.some((e) => e.code === "CONDITION_TARGET_TYPE_MISMATCH")).toBe(true);
  });

  it("passes when all condition references are valid", () => {
    const def = baseDef();
    const fieldId = generateId("field");
    def.pages[0]!.fields = [
      { id: fieldId, key: "q", label: "Frage", required: false, type: "yes_no" },
    ];
    def.conditions = [
      {
        id: generateId("condition"),
        logic: "and",
        rules: [{ fieldId, operator: "equals", value: true }],
        action: "end_form",
        targetId: def.endings[0]!.id,
      },
    ];
    const result = validateFormDefinition(def);
    expect(
      result.errors.some(
        (e) =>
          e.code === "CONDITION_REFERENCES_UNKNOWN_FIELD" ||
          e.code === "CONDITION_REFERENCES_UNKNOWN_TARGET" ||
          e.code === "CONDITION_TARGET_TYPE_MISMATCH",
      ),
    ).toBe(false);
  });
});
