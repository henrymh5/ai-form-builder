import { z } from "zod";
import { workflowEdgeSchema, workflowNodeSchema } from "./nodes";

export const CURRENT_WORKFLOW_SCHEMA_VERSION = 1;

/**
 * The canonical workflow schema. Single source of truth consumed by the
 * editor, the AI generator, server validation, and the execution engine —
 * mirrors lib/form-schema/schema.ts's role for forms.
 */
export const workflowDefinitionSchema = z.object({
  schemaVersion: z.literal(CURRENT_WORKFLOW_SCHEMA_VERSION),
  nodes: z.array(workflowNodeSchema).min(1).max(50),
  edges: z.array(workflowEdgeSchema).max(100),
});
export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;

export * from "./ids";
export * from "./nodes";
export * from "./webhook-url";
