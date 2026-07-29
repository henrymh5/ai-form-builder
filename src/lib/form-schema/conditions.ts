import { z } from "zod";

/**
 * Conditional logic structure — plan §4.1/§9.2. Pure schema definition only;
 * evaluation semantics live in lib/logic-engine (Phase 2).
 */

export const operatorSchema = z.enum([
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "is_answered",
  "is_not_answered",
  "greater_than",
  "less_than",
  "before_date",
  "after_date",
  "selection_includes",
]);
export type Operator = z.infer<typeof operatorSchema>;

export const conditionRuleSchema = z.object({
  fieldId: z.string(),
  operator: operatorSchema,
  // Not required for is_answered / is_not_answered.
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
});
export type ConditionRule = z.infer<typeof conditionRuleSchema>;

export const conditionActionSchema = z.enum([
  "show_field",
  "hide_field",
  "show_page",
  "skip_page",
  "jump_to_page",
  "end_form",
]);
export type ConditionAction = z.infer<typeof conditionActionSchema>;

export const conditionSchema = z.object({
  id: z.string(),
  logic: z.enum(["and", "or"]),
  rules: z.array(conditionRuleSchema).min(1).max(10),
  action: conditionActionSchema,
  // Field/page ID for show_field|hide_field|show_page|skip_page|jump_to_page;
  // ending ID for end_form. Not required when action is `end_form` and the
  // default ending should be used implicitly — but callers should prefer to
  // reference an explicit ending id for clarity (validated in Phase 1.5).
  targetId: z.string().optional(),
});
export type Condition = z.infer<typeof conditionSchema>;

/** Operators applicable to answerable field types, for Builder condition editor. */
export const OPERATORS_BY_FIELD_TYPE = {
  short_text: [
    "equals",
    "not_equals",
    "contains",
    "not_contains",
    "is_answered",
    "is_not_answered",
  ],
  long_text: ["contains", "not_contains", "is_answered", "is_not_answered"],
  email: ["equals", "not_equals", "contains", "is_answered", "is_not_answered"],
  phone: ["equals", "not_equals", "is_answered", "is_not_answered"],
  url: ["equals", "not_equals", "contains", "is_answered", "is_not_answered"],
  number: ["equals", "not_equals", "greater_than", "less_than", "is_answered", "is_not_answered"],
  date: ["equals", "before_date", "after_date", "is_answered", "is_not_answered"],
  time: ["equals", "before_date", "after_date", "is_answered", "is_not_answered"],
  single_choice: ["equals", "not_equals", "is_answered", "is_not_answered"],
  multiple_choice: ["selection_includes", "is_answered", "is_not_answered"],
  dropdown: ["equals", "not_equals", "is_answered", "is_not_answered"],
  yes_no: ["equals", "is_answered", "is_not_answered"],
  rating: ["equals", "greater_than", "less_than", "is_answered", "is_not_answered"],
  star_rating: ["equals", "greater_than", "less_than", "is_answered", "is_not_answered"],
  nps: ["equals", "greater_than", "less_than", "is_answered", "is_not_answered"],
  file_upload: ["is_answered", "is_not_answered"],
  consent: ["equals", "is_answered", "is_not_answered"],
  hidden: ["equals", "not_equals", "is_answered", "is_not_answered"],
} as const satisfies Record<string, readonly Operator[]>;
