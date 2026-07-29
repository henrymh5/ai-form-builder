import { describe, expect, it } from "vitest";
import { formDefinitionSchema } from "../schema";
import { isValid, validateFormDefinition } from "../validate";
import { buildWebagenturAnfrageFixture } from "./webagentur-anfrage";

describe("Webagentur-Anfrage fixture (plan §1 / §16 Phase 1 DoD)", () => {
  it("parses against the canonical schema", () => {
    const def = buildWebagenturAnfrageFixture();
    const result = formDefinitionSchema.safeParse(def);
    expect(result.success).toBe(true);
  });

  it("passes structural domain validation with no errors", () => {
    const def = buildWebagenturAnfrageFixture();
    const result = validateFormDefinition(def);
    expect(result.errors).toEqual([]);
    expect(isValid(result)).toBe(true);
  });

  it("has exactly one default ending and one budget-triggered ending", () => {
    const def = buildWebagenturAnfrageFixture();
    expect(def.endings.filter((e) => e.isDefault)).toHaveLength(1);
    expect(def.endings).toHaveLength(2);
  });

  it("has a condition that ends the form early for budgets under 2000 €", () => {
    const def = buildWebagenturAnfrageFixture();
    const budgetField = def.pages
      .flatMap((p) => p.fields)
      .find((f) => "key" in f && f.key === "budget")!;

    const smallBudgetCondition = def.conditions.find(
      (c) =>
        c.action === "end_form" &&
        c.rules.some((r) => r.fieldId === budgetField.id && r.value === "under_2000"),
    );
    expect(smallBudgetCondition).toBeDefined();

    const targetEnding = def.endings.find((e) => e.id === smallBudgetCondition!.targetId);
    expect(targetEnding?.isDefault).toBe(false);
  });
});
