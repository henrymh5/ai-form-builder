import { describe, expect, it } from "vitest";
import { diffFormDefinitions, isDiffEmpty } from "./diff";
import { createEmptyFormDefinition } from "./factory";
import { generateId } from "./ids";
import type { FormDefinition } from "./schema";

function withField(definition: FormDefinition, overrides: Partial<Record<string, unknown>> = {}) {
  const field = {
    id: generateId("field"),
    type: "short_text" as const,
    key: "name",
    label: "Name",
    required: false,
    ...overrides,
  };
  definition.pages[0]!.fields.push(field);
  return { definition, field };
}

describe("diffFormDefinitions", () => {
  it("reports no changes between a definition and itself", () => {
    const definition = createEmptyFormDefinition("Test");
    const diff = diffFormDefinitions(definition, definition);
    expect(isDiffEmpty(diff)).toBe(true);
  });

  it("detects an added field", () => {
    const before = createEmptyFormDefinition("Test");
    const after = structuredClone(before);
    withField(after);

    const diff = diffFormDefinitions(before, after);
    expect(diff.fieldChanges).toHaveLength(1);
    expect(diff.fieldChanges[0]!.kind).toBe("added");
  });

  it("detects a removed field", () => {
    const before = createEmptyFormDefinition("Test");
    withField(before);
    const after = createEmptyFormDefinition("Test");

    const diff = diffFormDefinitions(before, after);
    expect(diff.fieldChanges).toHaveLength(1);
    expect(diff.fieldChanges[0]!.kind).toBe("removed");
  });

  it("detects a label change on the same field id", () => {
    const before = createEmptyFormDefinition("Test");
    const { field } = withField(before);
    const after = structuredClone(before);
    (after.pages[0]!.fields[0] as { label: string }).label = "Neuer Name";

    const diff = diffFormDefinitions(before, after);
    expect(diff.fieldChanges).toEqual([
      {
        kind: "label_changed",
        fieldId: field.id,
        label: "Neuer Name",
        from: "Name",
        to: "Neuer Name",
      },
    ]);
  });

  it("detects a required-flag change", () => {
    const before = createEmptyFormDefinition("Test");
    withField(before, { required: false });
    const after = structuredClone(before);
    (after.pages[0]!.fields[0] as { required: boolean }).required = true;

    const diff = diffFormDefinitions(before, after);
    expect(diff.fieldChanges[0]!.kind).toBe("required_changed");
  });

  it("detects a title change", () => {
    const before = createEmptyFormDefinition("Alt");
    const after = createEmptyFormDefinition("Neu");
    const diff = diffFormDefinitions(before, after);
    expect(diff.titleChanged).toBe(true);
  });

  it("detects an added page", () => {
    const before = createEmptyFormDefinition("Test");
    const after = structuredClone(before);
    after.pages.push({ id: generateId("page"), fields: [] });

    const diff = diffFormDefinitions(before, after);
    expect(diff.pageChanges).toEqual([
      { kind: "added", pageId: after.pages[1]!.id, title: "Seite" },
    ]);
  });
});
