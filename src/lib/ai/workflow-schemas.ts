import { z } from "zod";

/**
 * AI-facing schema for workflow generation — mirrors lib/ai/schemas.ts's
 * role for forms: deliberately flatter than the canonical WorkflowDefinition.
 * Claude never produces real node/edge IDs (uses local `ref` aliases
 * instead) and never references fields by ID (uses the field's visible
 * label instead) — both are resolved server-side in convert-workflow.ts,
 * matching the rule that Claude never generates IDs (plan §6/§11).
 */

export const aiConditionRuleSchema = z.object({
  fieldLabel: z.string().min(1).max(500),
  operator: z.enum([
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
  ]),
  value: z.string().max(500).optional(),
});

export const aiWorkflowNodeSchema = z.discriminatedUnion("type", [
  z.object({
    ref: z.string().min(1).max(20),
    type: z.literal("condition"),
    logic: z.enum(["and", "or"]),
    rules: z.array(aiConditionRuleSchema).min(1).max(10),
  }),
  z.object({
    ref: z.string().min(1).max(20),
    type: z.literal("email"),
    to: z.enum(["creator", "submitter_field", "custom"]),
    submitterFieldLabel: z.string().max(500).optional(),
    customTo: z.string().email().optional(),
    subject: z.string().min(1).max(300),
    body: z.string().min(1).max(5000),
  }),
  z.object({
    ref: z.string().min(1).max(20),
    type: z.literal("webhook"),
    url: z.string().url().max(2000),
    includeAnswers: z.boolean(),
  }),
  z.object({
    ref: z.string().min(1).max(20),
    type: z.literal("responseAction"),
    action: z.enum(["set_status", "append_note", "mark_read"]),
    status: z.enum(["completed", "spam", "archived"]).optional(),
    noteText: z.string().max(2000).optional(),
  }),
  z.object({
    ref: z.string().min(1).max(20),
    type: z.literal("aiAction"),
    task: z.enum(["summarize", "classify", "translate"]),
    categories: z.array(z.string().min(1).max(100)).max(20).optional(),
    targetLanguage: z.string().min(2).max(30).optional(),
  }),
]);
export type AiWorkflowNode = z.infer<typeof aiWorkflowNodeSchema>;

export const aiWorkflowEdgeSchema = z.object({
  from: z.string().min(1).max(20),
  to: z.string().min(1).max(20),
  /** Omitted for edges from non-condition nodes. */
  branch: z.enum(["true", "false"]).optional(),
});
export type AiWorkflowEdge = z.infer<typeof aiWorkflowEdgeSchema>;

export const generateWorkflowOutputSchema = z.object({
  name: z.string().min(1).max(200),
  nodes: z.array(aiWorkflowNodeSchema).min(1).max(15),
  edges: z.array(aiWorkflowEdgeSchema).max(30),
});
export type GenerateWorkflowOutput = z.infer<typeof generateWorkflowOutputSchema>;

export const generateWorkflowInputSchema = z.object({
  formId: z.string().uuid(),
  description: z.string().min(10).max(2000),
});
export type GenerateWorkflowInput = z.infer<typeof generateWorkflowInputSchema>;
