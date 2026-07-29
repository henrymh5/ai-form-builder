import { z } from "zod";
import { conditionRuleSchema } from "@/lib/form-schema/conditions";
import { checkWebhookUrl } from "./webhook-url";

/**
 * Workflow node definitions — one Zod object per node type combined into a
 * discriminated union on `type`, mirroring lib/form-schema/fields.ts.
 *
 * `position` is the manually (or AI-auto-layouted) placed canvas position,
 * persisted as part of the definition so the editor doesn't need a separate
 * layout store.
 */

const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const baseNodeFields = {
  id: z.string(),
  position: positionSchema,
};

export const triggerNodeSchema = z.object({
  ...baseNodeFields,
  type: z.literal("trigger"),
  config: z.object({
    event: z.literal("response_submitted"),
    /**
     * Forms whose submissions trigger this workflow — the UI source of
     * truth for a workflow's trigger scope (mirrored into the
     * workflow_form_triggers join table for the enqueue lookup; see
     * lib/db/repositories/workflows.ts's syncWorkflowTriggerForms).
     * `.default([])` keeps pre-existing stored definitions parseable
     * without a schema-version bump.
     */
    formIds: z.array(z.string().uuid()).max(20).default([]),
  }),
});

export const conditionNodeSchema = z.object({
  ...baseNodeFields,
  type: z.literal("condition"),
  config: z.object({
    logic: z.enum(["and", "or"]),
    rules: z.array(conditionRuleSchema).min(1).max(10),
  }),
});

export const emailNodeSchema = z.object({
  ...baseNodeFields,
  type: z.literal("email"),
  config: z.object({
    to: z.enum(["creator", "submitter_field", "custom"]),
    submitterFieldId: z.string().optional(),
    customTo: z.string().email().optional(),
    subject: z.string().min(1).max(300),
    body: z.string().min(1).max(5000),
  }),
});

export const webhookNodeSchema = z.object({
  ...baseNodeFields,
  type: z.literal("webhook"),
  config: z.object({
    url: z
      .string()
      .url()
      .max(2000)
      .refine((url) => checkWebhookUrl(url).ok, {
        error: "Diese Webhook-URL ist nicht erlaubt (nur https, keine privaten/internen Adressen).",
      }),
    includeAnswers: z.boolean().default(true),
  }),
});

export const responseActionNodeSchema = z.object({
  ...baseNodeFields,
  type: z.literal("responseAction"),
  config: z.object({
    action: z.enum(["set_status", "append_note", "mark_read"]),
    status: z.enum(["completed", "spam", "archived"]).optional(),
    noteText: z.string().max(2000).optional(),
  }),
});

export const aiActionNodeSchema = z.object({
  ...baseNodeFields,
  type: z.literal("aiAction"),
  config: z.object({
    task: z.enum(["summarize", "classify", "translate"]),
    categories: z.array(z.string().min(1).max(100)).max(20).optional(),
    targetLanguage: z.string().min(2).max(10).optional(),
  }),
});

export const workflowNodeSchema = z.discriminatedUnion("type", [
  triggerNodeSchema,
  conditionNodeSchema,
  emailNodeSchema,
  webhookNodeSchema,
  responseActionNodeSchema,
  aiActionNodeSchema,
]);
export type WorkflowNode = z.infer<typeof workflowNodeSchema>;
export type WorkflowNodeType = WorkflowNode["type"];

/** Node types that perform a real side effect when executed. */
export const ACTION_NODE_TYPES: readonly WorkflowNodeType[] = [
  "email",
  "webhook",
  "responseAction",
  "aiAction",
];

export const workflowEdgeHandleSchema = z.enum(["out", "true", "false"]);
export type WorkflowEdgeHandle = z.infer<typeof workflowEdgeHandleSchema>;

export const workflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: workflowEdgeHandleSchema.default("out"),
});
export type WorkflowEdge = z.infer<typeof workflowEdgeSchema>;

/** Handles valid for a given node type — condition branches, everything else is a single "out". */
export function allowedHandlesFor(type: WorkflowNodeType): readonly WorkflowEdgeHandle[] {
  return type === "condition" ? ["true", "false"] : ["out"];
}
