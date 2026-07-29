import { describe, expect, it } from "vitest";
import { generateId } from "@/lib/form-schema/ids";
import type { Condition, Field, FormDefinition } from "@/lib/form-schema/schema";
import { getFieldVisibility, getPageVisibility, pruneHiddenAnswers } from "./visibility";

function makeField(overrides: Partial<Field> & { id: string; type: Field["type"] }): Field {
  return { key: overrides.id, label: "Field", required: false, ...overrides } as Field;
}

function makeDefinition(opts: {
  pages: { id: string; fields: Field[] }[];
  conditions: Condition[];
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
    endings: [{ id: "end_default", title: "Danke", isDefault: true }],
  };
}

describe("getFieldVisibility", () => {
  it("shows every field by default with no conditions", () => {
    const fieldA = makeField({ id: "fld_a", type: "short_text" });
    const fieldB = makeField({ id: "fld_b", type: "short_text" });
    const def = makeDefinition({
      pages: [{ id: "pg_1", fields: [fieldA, fieldB] }],
      conditions: [],
    });

    const visible = getFieldVisibility(def, {});
    expect(visible.has("fld_a")).toBe(true);
    expect(visible.has("fld_b")).toBe(true);
  });

  it("hide_field removes the target when the condition matches", () => {
    const trigger = makeField({ id: "fld_trigger", type: "yes_no" });
    const target = makeField({ id: "fld_target", type: "short_text" });
    const def = makeDefinition({
      pages: [{ id: "pg_1", fields: [trigger, target] }],
      conditions: [
        {
          id: generateId("condition"),
          logic: "and",
          rules: [{ fieldId: "fld_trigger", operator: "equals", value: true }],
          action: "hide_field",
          targetId: "fld_target",
        },
      ],
    });

    expect(getFieldVisibility(def, { fld_trigger: true }).has("fld_target")).toBe(false);
    expect(getFieldVisibility(def, { fld_trigger: false }).has("fld_target")).toBe(true);
  });

  it("show_field only shows the target when the condition matches (default hidden)", () => {
    const trigger = makeField({ id: "fld_trigger", type: "yes_no" });
    const target = makeField({ id: "fld_target", type: "short_text" });
    const def = makeDefinition({
      pages: [{ id: "pg_1", fields: [trigger, target] }],
      conditions: [
        {
          id: generateId("condition"),
          logic: "and",
          rules: [{ fieldId: "fld_trigger", operator: "equals", value: true }],
          action: "show_field",
          targetId: "fld_target",
        },
      ],
    });

    expect(getFieldVisibility(def, { fld_trigger: true }).has("fld_target")).toBe(true);
    expect(getFieldVisibility(def, { fld_trigger: false }).has("fld_target")).toBe(false);
  });

  it("hide wins over show for the same target (plan §9.2 priority)", () => {
    const triggerA = makeField({ id: "fld_a", type: "yes_no" });
    const triggerB = makeField({ id: "fld_b", type: "yes_no" });
    const target = makeField({ id: "fld_target", type: "short_text" });
    const def = makeDefinition({
      pages: [{ id: "pg_1", fields: [triggerA, triggerB, target] }],
      conditions: [
        {
          id: generateId("condition"),
          logic: "and",
          rules: [{ fieldId: "fld_a", operator: "equals", value: true }],
          action: "show_field",
          targetId: "fld_target",
        },
        {
          id: generateId("condition"),
          logic: "and",
          rules: [{ fieldId: "fld_b", operator: "equals", value: true }],
          action: "hide_field",
          targetId: "fld_target",
        },
      ],
    });

    // Both conditions match — show says visible, hide says hidden. Hide wins.
    expect(getFieldVisibility(def, { fld_a: true, fld_b: true }).has("fld_target")).toBe(false);
  });
});

describe("getPageVisibility", () => {
  it("skip_page hides the target page when matched; hide wins over show", () => {
    const trigger = makeField({ id: "fld_trigger", type: "yes_no" });
    const def = makeDefinition({
      pages: [
        { id: "pg_1", fields: [trigger] },
        { id: "pg_2", fields: [] },
      ],
      conditions: [
        {
          id: generateId("condition"),
          logic: "and",
          rules: [{ fieldId: "fld_trigger", operator: "equals", value: true }],
          action: "skip_page",
          targetId: "pg_2",
        },
      ],
    });

    expect(getPageVisibility(def, { fld_trigger: true }).has("pg_2")).toBe(false);
    expect(getPageVisibility(def, { fld_trigger: false }).has("pg_2")).toBe(true);
  });
});

describe("pruneHiddenAnswers", () => {
  it("removes the answer of a field that just became hidden", () => {
    const trigger = makeField({ id: "fld_trigger", type: "yes_no" });
    const target = makeField({ id: "fld_target", type: "short_text" });
    const def = makeDefinition({
      pages: [{ id: "pg_1", fields: [trigger, target] }],
      conditions: [
        {
          id: generateId("condition"),
          logic: "and",
          rules: [{ fieldId: "fld_trigger", operator: "equals", value: true }],
          action: "hide_field",
          targetId: "fld_target",
        },
      ],
    });

    const pruned = pruneHiddenAnswers(def, { fld_trigger: true, fld_target: "leftover answer" });
    expect(pruned).toEqual({ fld_trigger: true });
  });

  it("cascades: a chain of dependent hidden fields is fully pruned in one call", () => {
    // fld_a hides fld_b; fld_b (while still answered) hides fld_c. Both
    // fld_b's and fld_c's answers are removed by pruneHiddenAnswers, even
    // though fld_c's hide condition only matches via fld_b's now-stale answer.
    const fieldA = makeField({ id: "fld_a", type: "yes_no" });
    const fieldB = makeField({ id: "fld_b", type: "yes_no" });
    const fieldC = makeField({ id: "fld_c", type: "short_text" });
    const def = makeDefinition({
      pages: [{ id: "pg_1", fields: [fieldA, fieldB, fieldC] }],
      conditions: [
        {
          id: generateId("condition"),
          logic: "and",
          rules: [{ fieldId: "fld_a", operator: "equals", value: true }],
          action: "hide_field",
          targetId: "fld_b",
        },
        {
          id: generateId("condition"),
          logic: "and",
          rules: [{ fieldId: "fld_b", operator: "equals", value: true }],
          action: "hide_field",
          targetId: "fld_c",
        },
      ],
    });

    const pruned = pruneHiddenAnswers(def, { fld_a: true, fld_b: true, fld_c: "kept" });
    expect(pruned).toEqual({ fld_a: true });
  });

  it("restores a downstream answer once its hiding condition no longer matches", () => {
    // Same chain as above, but fld_b's stale answer flips to false in a
    // second prune call — fld_c's hide condition ("fld_b equals true") no
    // longer matches, so fld_c stays visible.
    const fieldA = makeField({ id: "fld_a", type: "yes_no" });
    const fieldB = makeField({ id: "fld_b", type: "yes_no" });
    const fieldC = makeField({ id: "fld_c", type: "short_text" });
    const def = makeDefinition({
      pages: [{ id: "pg_1", fields: [fieldA, fieldB, fieldC] }],
      conditions: [
        {
          id: generateId("condition"),
          logic: "and",
          rules: [{ fieldId: "fld_a", operator: "equals", value: true }],
          action: "hide_field",
          targetId: "fld_b",
        },
        {
          id: generateId("condition"),
          logic: "and",
          rules: [{ fieldId: "fld_b", operator: "equals", value: true }],
          action: "hide_field",
          targetId: "fld_c",
        },
      ],
    });

    const pruned = pruneHiddenAnswers(def, { fld_a: true, fld_b: false, fld_c: "kept" });
    expect(pruned).toEqual({ fld_a: true, fld_c: "kept" });
  });

  it("leaves answers for fields not present in the definition untouched", () => {
    const def = makeDefinition({ pages: [{ id: "pg_1", fields: [] }], conditions: [] });
    const pruned = pruneHiddenAnswers(def, { external_key: "value" });
    expect(pruned).toEqual({ external_key: "value" });
  });
});
