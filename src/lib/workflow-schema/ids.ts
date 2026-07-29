import { customAlphabet } from "nanoid";

/**
 * Typed ID generation for the canonical workflow schema — mirrors
 * lib/form-schema/ids.ts. IDs are generated exclusively here — never by the
 * AI (see lib/ai/convert-workflow.ts).
 */
const nanoid = customAlphabet("23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ", 12);

export const WORKFLOW_ID_PREFIXES = {
  node: "wfn_",
  edge: "wfe_",
} as const;

export type WorkflowIdKind = keyof typeof WORKFLOW_ID_PREFIXES;

export function generateWorkflowId(kind: WorkflowIdKind): string {
  return `${WORKFLOW_ID_PREFIXES[kind]}${nanoid()}`;
}
