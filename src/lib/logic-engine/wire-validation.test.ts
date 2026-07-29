import { describe, expect, it } from "vitest";
import { generateId } from "@/lib/form-schema/ids";
import { isValid, validateFormDefinition } from "@/lib/form-schema/validate";
import { buildWebagenturAnfrageFixture } from "@/lib/form-schema/fixtures/webagentur-anfrage";
import { logicEngineGraphAnalysis } from "./wire-validation";

describe("validateFormDefinition wired with the real Logic Engine", () => {
  it("passes the Webagentur-Anfrage fixture with zero errors and zero graph warnings", () => {
    const def = buildWebagenturAnfrageFixture();
    const result = validateFormDefinition(def, logicEngineGraphAnalysis);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(isValid(result)).toBe(true);
  });

  it("reports CYCLIC_LOGIC as an error when two jump_to_page conditions form a loop", () => {
    const def = buildWebagenturAnfrageFixture();
    const pageAId = def.pages[0]!.id;
    const pageBId = def.pages[1]!.id;
    const triggerFieldId = def.pages[0]!.fields[0]!.id;

    def.conditions.push(
      {
        id: generateId("condition"),
        logic: "and",
        rules: [{ fieldId: triggerFieldId, operator: "is_answered" }],
        action: "jump_to_page",
        targetId: pageBId,
      },
      {
        id: generateId("condition"),
        logic: "and",
        rules: [{ fieldId: triggerFieldId, operator: "is_answered" }],
        action: "jump_to_page",
        targetId: pageAId,
      },
    );

    const result = validateFormDefinition(def, logicEngineGraphAnalysis);
    expect(result.errors.some((e) => e.code === "CYCLIC_LOGIC")).toBe(true);
  });

  it("reports UNREACHABLE_PAGE as a warning for a page bypassed by a guaranteed jump", () => {
    const def = buildWebagenturAnfrageFixture();
    const firstPage = def.pages[0]!;
    const requiredField = firstPage.fields.find((f) => "required" in f && f.required)!;

    def.conditions.push({
      id: generateId("condition"),
      logic: "and",
      rules: [{ fieldId: requiredField.id, operator: "is_answered" }],
      action: "jump_to_page",
      targetId: def.pages[2]!.id,
    });

    const result = validateFormDefinition(def, logicEngineGraphAnalysis);
    expect(result.warnings.some((w) => w.code === "UNREACHABLE_PAGE")).toBe(true);
  });
});
