import { CURRENT_WORKFLOW_SCHEMA_VERSION, type WorkflowDefinition } from "./schema";
import { generateWorkflowId } from "./ids";

/** Creates a minimal, valid workflow definition containing only a trigger node. */
export function createEmptyWorkflowDefinition(initialFormIds: string[] = []): WorkflowDefinition {
  return {
    schemaVersion: CURRENT_WORKFLOW_SCHEMA_VERSION,
    nodes: [
      {
        id: generateWorkflowId("node"),
        type: "trigger",
        position: { x: 0, y: 0 },
        config: { event: "response_submitted", formIds: initialFormIds },
      },
    ],
    edges: [],
  };
}
