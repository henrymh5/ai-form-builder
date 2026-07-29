import { describe, expect, it } from "vitest";
import type { Condition, ConditionRule } from "@/lib/form-schema/schema";
import { evaluateCondition, evaluateRule, type AnswerMap } from "./evaluate";

const FIELD = "fld_test";

function rule(overrides: Partial<ConditionRule>): ConditionRule {
  return { fieldId: FIELD, operator: "equals", ...overrides };
}

describe("evaluateRule — is_answered / is_not_answered", () => {
  it("is_answered is true for any non-empty value, including 0 and false", () => {
    expect(evaluateRule(rule({ operator: "is_answered" }), { [FIELD]: "x" })).toBe(true);
    expect(evaluateRule(rule({ operator: "is_answered" }), { [FIELD]: 0 })).toBe(true);
    expect(evaluateRule(rule({ operator: "is_answered" }), { [FIELD]: false })).toBe(true);
    expect(evaluateRule(rule({ operator: "is_answered" }), { [FIELD]: ["a"] })).toBe(true);
  });

  it("is_answered is false for empty string, empty array, undefined, missing field", () => {
    expect(evaluateRule(rule({ operator: "is_answered" }), { [FIELD]: "" })).toBe(false);
    expect(evaluateRule(rule({ operator: "is_answered" }), { [FIELD]: [] })).toBe(false);
    expect(evaluateRule(rule({ operator: "is_answered" }), { [FIELD]: undefined })).toBe(false);
    expect(evaluateRule(rule({ operator: "is_answered" }), {})).toBe(false);
  });

  it("is_not_answered is the exact inverse", () => {
    expect(evaluateRule(rule({ operator: "is_not_answered" }), { [FIELD]: "x" })).toBe(false);
    expect(evaluateRule(rule({ operator: "is_not_answered" }), {})).toBe(true);
  });

  it("a rule on a deleted/unknown field only ever satisfies is_not_answered", () => {
    const unknownFieldRule = rule({ fieldId: "fld_deleted", operator: "equals", value: "x" });
    expect(evaluateRule(unknownFieldRule, {})).toBe(false);
    expect(evaluateRule({ ...unknownFieldRule, operator: "is_not_answered" }, {})).toBe(true);
    expect(evaluateRule({ ...unknownFieldRule, operator: "is_answered" }, {})).toBe(false);
  });
});

describe("evaluateRule — string operators", () => {
  it("equals / not_equals", () => {
    const answers: AnswerMap = { [FIELD]: "hello" };
    expect(evaluateRule(rule({ operator: "equals", value: "hello" }), answers)).toBe(true);
    expect(evaluateRule(rule({ operator: "equals", value: "world" }), answers)).toBe(false);
    expect(evaluateRule(rule({ operator: "not_equals", value: "world" }), answers)).toBe(true);
    expect(evaluateRule(rule({ operator: "not_equals", value: "hello" }), answers)).toBe(false);
  });

  it("contains / not_contains", () => {
    const answers: AnswerMap = { [FIELD]: "hello world" };
    expect(evaluateRule(rule({ operator: "contains", value: "world" }), answers)).toBe(true);
    expect(evaluateRule(rule({ operator: "contains", value: "xyz" }), answers)).toBe(false);
    expect(evaluateRule(rule({ operator: "not_contains", value: "xyz" }), answers)).toBe(true);
  });
});

describe("evaluateRule — number operators", () => {
  it("equals / greater_than / less_than", () => {
    const answers: AnswerMap = { [FIELD]: 42 };
    expect(evaluateRule(rule({ operator: "equals", value: 42 }), answers)).toBe(true);
    expect(evaluateRule(rule({ operator: "greater_than", value: 10 }), answers)).toBe(true);
    expect(evaluateRule(rule({ operator: "greater_than", value: 100 }), answers)).toBe(false);
    expect(evaluateRule(rule({ operator: "less_than", value: 100 }), answers)).toBe(true);
  });

  it("0 is treated as answered, not as missing", () => {
    const answers: AnswerMap = { [FIELD]: 0 };
    expect(evaluateRule(rule({ operator: "equals", value: 0 }), answers)).toBe(true);
  });
});

describe("evaluateRule — date operators", () => {
  it("before_date / after_date compare ISO date strings", () => {
    const answers: AnswerMap = { [FIELD]: "2026-06-01" };
    expect(evaluateRule(rule({ operator: "before_date", value: "2026-12-01" }), answers)).toBe(
      true,
    );
    expect(evaluateRule(rule({ operator: "after_date", value: "2026-01-01" }), answers)).toBe(true);
    expect(evaluateRule(rule({ operator: "after_date", value: "2026-12-01" }), answers)).toBe(
      false,
    );
  });
});

describe("evaluateRule — selection_includes (multi-select)", () => {
  it("checks membership in an array answer", () => {
    const answers: AnswerMap = { [FIELD]: ["a", "b", "c"] };
    expect(evaluateRule(rule({ operator: "selection_includes", value: "b" }), answers)).toBe(true);
    expect(evaluateRule(rule({ operator: "selection_includes", value: "z" }), answers)).toBe(false);
  });

  it("equals on an array answer is always false (type mismatch, not a crash)", () => {
    const answers: AnswerMap = { [FIELD]: ["a", "b"] };
    expect(evaluateRule(rule({ operator: "equals", value: "a" }), answers)).toBe(false);
  });
});

describe("evaluateCondition — AND/OR logic", () => {
  function condition(overrides: Partial<Condition>): Condition {
    return {
      id: "cnd_test",
      logic: "and",
      rules: [rule({ operator: "equals", value: "a" })],
      action: "show_field",
      targetId: "fld_target",
      ...overrides,
    };
  }

  it("AND requires every rule to be true", () => {
    const c = condition({
      logic: "and",
      rules: [
        { fieldId: "fld_1", operator: "equals", value: "a" },
        { fieldId: "fld_2", operator: "equals", value: "b" },
      ],
    });
    expect(evaluateCondition(c, { fld_1: "a", fld_2: "b" })).toBe(true);
    expect(evaluateCondition(c, { fld_1: "a", fld_2: "x" })).toBe(false);
  });

  it("OR requires at least one rule to be true", () => {
    const c = condition({
      logic: "or",
      rules: [
        { fieldId: "fld_1", operator: "equals", value: "a" },
        { fieldId: "fld_2", operator: "equals", value: "b" },
      ],
    });
    expect(evaluateCondition(c, { fld_1: "a", fld_2: "x" })).toBe(true);
    expect(evaluateCondition(c, { fld_1: "x", fld_2: "y" })).toBe(false);
  });

  it("an empty rules array never matches (defensive, though schema forbids it)", () => {
    const c = condition({ rules: [] });
    expect(evaluateCondition(c, {})).toBe(false);
  });
});
