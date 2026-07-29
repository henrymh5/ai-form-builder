import type { Condition, ConditionRule, Field } from "@/lib/form-schema/schema";

/**
 * Rule and condition evaluation — plan §9.1/§9.2. Pure, deterministic,
 * defensive: a rule referencing a deleted/unknown field never throws, it
 * just evaluates to `false` (except `is_not_answered`, which is `true` for
 * anything unanswered — see the semantics note below).
 */

export type AnswerValue = string | number | boolean | string[] | undefined;
export type AnswerMap = Record<string, AnswerValue>;

function isAnswered(value: AnswerValue): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true; // numbers (incl. 0) and booleans (incl. false) count as answered
}

function toComparableDate(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

/**
 * Evaluates a single rule against the current answers.
 *
 * Semantics (plan §9.2): a rule on a field that is unanswered — including
 * fields that are themselves currently hidden — only ever satisfies
 * `is_not_answered`; every other operator evaluates to `false`. This applies
 * uniformly whether the field is missing entirely (deleted/unknown field
 * reference) or simply has no answer yet.
 */
export function evaluateRule(rule: ConditionRule, answers: AnswerMap): boolean {
  const value = answers[rule.fieldId];
  const answered = isAnswered(value);

  if (rule.operator === "is_answered") return answered;
  if (rule.operator === "is_not_answered") return !answered;
  if (!answered) return false;

  switch (rule.operator) {
    case "equals":
      return Array.isArray(value) ? false : value === rule.value;

    case "not_equals":
      return Array.isArray(value) ? false : value !== rule.value;

    case "contains":
      return typeof value === "string" && typeof rule.value === "string"
        ? value.includes(rule.value)
        : false;

    case "not_contains":
      return typeof value === "string" && typeof rule.value === "string"
        ? !value.includes(rule.value)
        : false;

    case "greater_than":
      return typeof value === "number" && typeof rule.value === "number"
        ? value > rule.value
        : false;

    case "less_than":
      return typeof value === "number" && typeof rule.value === "number"
        ? value < rule.value
        : false;

    case "before_date": {
      const a = toComparableDate(value);
      const b = toComparableDate(rule.value);
      return a !== undefined && b !== undefined ? a < b : false;
    }

    case "after_date": {
      const a = toComparableDate(value);
      const b = toComparableDate(rule.value);
      return a !== undefined && b !== undefined ? a > b : false;
    }

    case "selection_includes":
      return Array.isArray(value) && typeof rule.value === "string"
        ? value.includes(rule.value)
        : false;

    default:
      return false;
  }
}

/** Evaluates a condition's rules combined with its AND/OR logic operator. */
export function evaluateCondition(condition: Condition, answers: AnswerMap): boolean {
  if (condition.rules.length === 0) return false;

  return condition.logic === "and"
    ? condition.rules.every((rule) => evaluateRule(rule, answers))
    : condition.rules.some((rule) => evaluateRule(rule, answers));
}

/** Builds an AnswerMap from a flat list of visible fields, useful for tests/fixtures. */
export function answersFor(fields: Field[], values: AnswerMap): AnswerMap {
  const result: AnswerMap = {};
  for (const field of fields) {
    if ("key" in field && field.key in values) {
      result[field.id] = values[field.key];
    }
  }
  return result;
}
