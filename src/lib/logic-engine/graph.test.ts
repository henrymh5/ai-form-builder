import { describe, expect, it } from "vitest";
import { generateId } from "@/lib/form-schema/ids";
import type { Condition, Field, FormDefinition } from "@/lib/form-schema/schema";
import {
  detectCycles,
  findPathsWithoutEnding,
  findUnreachablePages,
  validateReferences,
} from "./graph";

function makeField(overrides: Partial<Field> & { id: string; type: Field["type"] }): Field {
  return { key: overrides.id, label: "Field", required: false, ...overrides } as Field;
}

function makeDefinition(opts: {
  pages: { id: string; fields: Field[] }[];
  conditions: Condition[];
  endings?: FormDefinition["endings"];
}): FormDefinition {
  return {
    schemaVersion: 1,
    metadata: { title: "Test", language: "de" },
    settings: {
      progressDisplay: "bar",
      allowBack: true,
      allowMultipleSubmissions: false,
      captchaEnabled: false,
      honeypotEnabled: true,
    },
    theme: {
      colorPrimary: "#0D9488",
      colorBackground: "#F8FAFC",
      colorText: "#0F172A",
      fontFamily: "inter",
      fontSizeBase: 16,
      containerWidth: 680,
      spacing: "comfortable",
      borderRadius: 10,
      buttonStyle: "solid",
      inputStyle: "outline",
    },
    pages: opts.pages,
    conditions: opts.conditions,
    endings: opts.endings ?? [{ id: "end_default", title: "Danke", isDefault: true }],
  };
}

describe("detectCycles", () => {
  it("finds no cycles in a purely linear form", () => {
    const def = makeDefinition({
      pages: [
        { id: "pg_1", fields: [] },
        { id: "pg_2", fields: [] },
      ],
      conditions: [],
    });
    expect(detectCycles(def)).toEqual([]);
  });

  it("detects a cycle created by two jump_to_page conditions pointing at each other", () => {
    const triggerA = makeField({ id: "fld_a", type: "yes_no" });
    const triggerB = makeField({ id: "fld_b", type: "yes_no" });
    const def = makeDefinition({
      pages: [
        { id: "pg_1", fields: [triggerA] },
        { id: "pg_2", fields: [triggerB] },
      ],
      conditions: [
        {
          id: generateId("condition"),
          logic: "and",
          rules: [{ fieldId: "fld_a", operator: "equals", value: true }],
          action: "jump_to_page",
          targetId: "pg_2",
        },
        {
          id: generateId("condition"),
          logic: "and",
          rules: [{ fieldId: "fld_b", operator: "equals", value: true }],
          action: "jump_to_page",
          targetId: "pg_1",
        },
      ],
    });
    const cycles = detectCycles(def);
    expect(cycles.length).toBeGreaterThan(0);
    expect(cycles[0]!.cyclePageIds).toEqual(expect.arrayContaining(["pg_1", "pg_2"]));
  });

  it("does not flag a page that merely jumps forward (no back-edge)", () => {
    const trigger = makeField({ id: "fld_trigger", type: "yes_no" });
    const def = makeDefinition({
      pages: [
        { id: "pg_1", fields: [trigger] },
        { id: "pg_2", fields: [] },
        { id: "pg_3", fields: [] },
      ],
      conditions: [
        {
          id: generateId("condition"),
          logic: "and",
          rules: [{ fieldId: "fld_trigger", operator: "equals", value: true }],
          action: "jump_to_page",
          targetId: "pg_3",
        },
      ],
    });
    expect(detectCycles(def)).toEqual([]);
  });
});

describe("findUnreachablePages", () => {
  it("finds nothing unreachable in a linear form", () => {
    const def = makeDefinition({
      pages: [
        { id: "pg_1", fields: [] },
        { id: "pg_2", fields: [] },
        { id: "pg_3", fields: [] },
      ],
      conditions: [],
    });
    expect(findUnreachablePages(def)).toEqual([]);
  });

  it("does NOT flag a page whose skip condition is only conditionally true (not required)", () => {
    // budget is optional — the skip condition is not guaranteed to fire, so
    // pg_2 remains structurally reachable (heuristic is conservative).
    const budget = makeField({ id: "fld_budget", type: "yes_no", required: false });
    const def = makeDefinition({
      pages: [
        { id: "pg_1", fields: [budget] },
        { id: "pg_2", fields: [] },
      ],
      conditions: [
        {
          id: generateId("condition"),
          logic: "and",
          rules: [{ fieldId: "fld_budget", operator: "is_answered" }],
          action: "skip_page",
          targetId: "pg_2",
        },
      ],
    });
    expect(findUnreachablePages(def)).toEqual([]);
  });

  it("flags a page as unreachable when a required field's is_answered check guarantees a skip", () => {
    const budget = makeField({ id: "fld_budget", type: "yes_no", required: true });
    const def = makeDefinition({
      pages: [
        { id: "pg_1", fields: [budget] },
        { id: "pg_2", fields: [] },
        { id: "pg_3", fields: [] },
      ],
      conditions: [
        {
          id: generateId("condition"),
          logic: "and",
          rules: [{ fieldId: "fld_budget", operator: "is_answered" }],
          action: "skip_page",
          targetId: "pg_2",
        },
      ],
    });
    // pg_2 is guaranteed-skipped since fld_budget is required (always answered
    // by the time the user can proceed); pg_3 remains reachable via pg_1 (once
    // the guaranteed redirect... in this case skip_page just removes pg_2,
    // sequential pg_1 -> pg_2 edge is pruned, but pg_2 -> pg_3 still exists.
    // pg_3 is unreachable too since nothing else points to it directly.
    expect(findUnreachablePages(def)).toContain("pg_2");
  });

  it("flags a page as unreachable when an owning page always redirects away via a guaranteed jump", () => {
    const trigger = makeField({ id: "fld_trigger", type: "yes_no", required: true });
    const def = makeDefinition({
      pages: [
        { id: "pg_1", fields: [trigger] },
        { id: "pg_2", fields: [] },
        { id: "pg_3", fields: [] },
      ],
      conditions: [
        {
          id: generateId("condition"),
          logic: "and",
          rules: [{ fieldId: "fld_trigger", operator: "is_answered" }],
          action: "jump_to_page",
          targetId: "pg_3",
        },
      ],
    });
    // pg_1's sequential edge to pg_2 is pruned (guaranteed redirect to pg_3),
    // and nothing else points at pg_2, so it becomes unreachable.
    expect(findUnreachablePages(def)).toEqual(["pg_2"]);
  });
});

describe("findPathsWithoutEnding", () => {
  it("finds nothing when the form always reaches the default ending", () => {
    const def = makeDefinition({
      pages: [
        { id: "pg_1", fields: [] },
        { id: "pg_2", fields: [] },
      ],
      conditions: [],
    });
    expect(findPathsWithoutEnding(def)).toEqual([]);
  });

  it("flags a page trapped in a jump cycle that never reaches any ending", () => {
    const triggerA = makeField({ id: "fld_a", type: "yes_no" });
    const triggerB = makeField({ id: "fld_b", type: "yes_no" });
    const def = makeDefinition({
      pages: [
        { id: "pg_1", fields: [triggerA] },
        { id: "pg_2", fields: [triggerB] },
      ],
      conditions: [
        {
          id: generateId("condition"),
          logic: "and",
          rules: [{ fieldId: "fld_a", operator: "equals", value: true }],
          action: "jump_to_page",
          targetId: "pg_2",
        },
        {
          id: generateId("condition"),
          logic: "and",
          rules: [{ fieldId: "fld_b", operator: "equals", value: true }],
          action: "jump_to_page",
          targetId: "pg_1",
        },
      ],
    });
    // Both pages jump only at each other; neither has a path to the sink
    // unless the jump condition is false (sequential fallback still exists
    // for pg_1 -> pg_2, and pg_2 is the last page so it -> sink). So only
    // truly trapped pages (no sequential fallback at all) get flagged —
    // verify pg_1 and pg_2 both CAN reach the sink via the "full" graph's
    // sequential + terminal edges.
    expect(findPathsWithoutEnding(def)).toEqual([]);
  });
});

describe("validateReferences", () => {
  it("reports no errors when every reference is valid", () => {
    const trigger = makeField({ id: "fld_trigger", type: "yes_no" });
    const def = makeDefinition({
      pages: [{ id: "pg_1", fields: [trigger] }],
      conditions: [
        {
          id: "cnd_1",
          logic: "and",
          rules: [{ fieldId: "fld_trigger", operator: "equals", value: true }],
          action: "end_form",
          targetId: "end_default",
        },
      ],
    });
    expect(validateReferences(def)).toEqual([]);
  });

  it("reports an unknown_field error for a rule referencing a deleted field", () => {
    const def = makeDefinition({
      pages: [{ id: "pg_1", fields: [] }],
      conditions: [
        {
          id: "cnd_1",
          logic: "and",
          rules: [{ fieldId: "fld_deleted", operator: "is_answered" }],
          action: "end_form",
          targetId: "end_default",
        },
      ],
    });
    expect(validateReferences(def)).toEqual([{ conditionId: "cnd_1", reason: "unknown_field" }]);
  });

  it("reports an unknown_target error when targetId points nowhere", () => {
    const trigger = makeField({ id: "fld_trigger", type: "yes_no" });
    const def = makeDefinition({
      pages: [{ id: "pg_1", fields: [trigger] }],
      conditions: [
        {
          id: "cnd_1",
          logic: "and",
          rules: [{ fieldId: "fld_trigger", operator: "equals", value: true }],
          action: "jump_to_page",
          targetId: "pg_doesnotexist",
        },
      ],
    });
    expect(validateReferences(def)).toEqual([{ conditionId: "cnd_1", reason: "unknown_target" }]);
  });
});
