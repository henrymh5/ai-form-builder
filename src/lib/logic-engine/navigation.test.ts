import { describe, expect, it } from "vitest";
import { generateId } from "@/lib/form-schema/ids";
import type { Condition, Field, FormDefinition } from "@/lib/form-schema/schema";
import { computeProgress, getNextStep, getReachablePages } from "./navigation";

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

describe("getNextStep — linear default path", () => {
  it("advances to the next page in document order with no matching conditions", () => {
    const def = makeDefinition({
      pages: [
        { id: "pg_1", fields: [] },
        { id: "pg_2", fields: [] },
      ],
      conditions: [],
    });
    expect(getNextStep(def, "pg_1", {})).toEqual({ kind: "page", pageId: "pg_2" });
  });

  it("reaches the default ending after the last page", () => {
    const def = makeDefinition({ pages: [{ id: "pg_1", fields: [] }], conditions: [] });
    expect(getNextStep(def, "pg_1", {})).toEqual({ kind: "ending", endingId: "end_default" });
  });

  it("skips a page hidden by skip_page and lands on the next visible one", () => {
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
          action: "skip_page",
          targetId: "pg_2",
        },
      ],
    });
    expect(getNextStep(def, "pg_1", { fld_trigger: true })).toEqual({
      kind: "page",
      pageId: "pg_3",
    });
    expect(getNextStep(def, "pg_1", { fld_trigger: false })).toEqual({
      kind: "page",
      pageId: "pg_2",
    });
  });
});

describe("getNextStep — priorities (plan §9.2)", () => {
  it("end_form wins over jump_to_page when both match", () => {
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
          action: "jump_to_page",
          targetId: "pg_2",
        },
        {
          id: generateId("condition"),
          logic: "and",
          rules: [{ fieldId: "fld_trigger", operator: "equals", value: true }],
          action: "end_form",
          targetId: "end_default",
        },
      ],
      endings: [{ id: "end_default", title: "Danke", isDefault: true }],
    });
    expect(getNextStep(def, "pg_1", { fld_trigger: true })).toEqual({
      kind: "ending",
      endingId: "end_default",
    });
  });

  it("the first matching jump_to_page condition in array order wins", () => {
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
          targetId: "pg_2",
        },
        {
          id: generateId("condition"),
          logic: "and",
          rules: [{ fieldId: "fld_trigger", operator: "equals", value: true }],
          action: "jump_to_page",
          targetId: "pg_3",
        },
      ],
    });
    expect(getNextStep(def, "pg_1", { fld_trigger: true })).toEqual({
      kind: "page",
      pageId: "pg_2",
    });
  });

  it("jump_to_page falls back to the ending's own targetId when it points at a specific ending", () => {
    const trigger = makeField({ id: "fld_trigger", type: "yes_no" });
    const def = makeDefinition({
      pages: [{ id: "pg_1", fields: [trigger] }],
      conditions: [
        {
          id: generateId("condition"),
          logic: "and",
          rules: [{ fieldId: "fld_trigger", operator: "equals", value: true }],
          action: "end_form",
          targetId: "end_special",
        },
      ],
      endings: [
        { id: "end_default", title: "Danke", isDefault: true },
        { id: "end_special", title: "Spezieller Abschluss", isDefault: false },
      ],
    });
    expect(getNextStep(def, "pg_1", { fld_trigger: true })).toEqual({
      kind: "ending",
      endingId: "end_special",
    });
  });
});

describe("getReachablePages / computeProgress — dynamic paths", () => {
  it("excludes skipped pages from the reachable path and progress total", () => {
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
          action: "skip_page",
          targetId: "pg_2",
        },
      ],
    });

    const reachable = getReachablePages(def, { fld_trigger: true });
    expect(reachable).toEqual(["pg_1", "pg_3"]);

    const progress = computeProgress(def, "pg_3", { fld_trigger: true });
    expect(progress.totalSteps).toBe(2);
    expect(progress.currentStepNumber).toBe(2);
    expect(progress.percent).toBe(100);
  });

  it("includes all pages when no conditions skip anything", () => {
    const def = makeDefinition({
      pages: [
        { id: "pg_1", fields: [] },
        { id: "pg_2", fields: [] },
        { id: "pg_3", fields: [] },
      ],
      conditions: [],
    });
    expect(getReachablePages(def, {})).toEqual(["pg_1", "pg_2", "pg_3"]);

    const progress = computeProgress(def, "pg_2", {});
    expect(progress).toEqual({ currentStepNumber: 2, totalSteps: 3, percent: 67 });
  });

  it("stops early when end_form is reached before the last page", () => {
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
          action: "end_form",
          targetId: "end_default",
        },
      ],
    });
    expect(getReachablePages(def, { fld_trigger: true })).toEqual(["pg_1"]);
  });
});
