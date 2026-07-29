"use client";

import { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { ConfigPanel } from "./config-panel/config-panel";
import { NodePalette } from "./node-palette";
import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowEditorToolbar } from "./workflow-editor-toolbar";
import { useWorkflowEditorStore } from "./workflow-editor-store";
import type { TestRunResponseOption } from "./test-run-dialog";
import type { WorkflowRecord } from "@/lib/db/repositories/workflows";
import type { WorkflowFormRef } from "@/lib/workflow-schema/validate";

export function WorkflowEditorClient({
  workflow,
  forms,
  webhookSecret,
  responses,
}: {
  workflow: WorkflowRecord;
  forms: WorkflowFormRef[];
  webhookSecret: string | null;
  responses: TestRunResponseOption[];
}) {
  const load = useWorkflowEditorStore((s) => s.load);

  useEffect(() => {
    load({ workflowId: workflow.id, workspaceId: workflow.workspaceId, definition: workflow.definition, forms });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: load once per workflow id, not on every store re-render
  }, [workflow.id]);

  return (
    <div
      data-full-bleed
      className="flex h-[calc(100vh-var(--layout-header-height))] min-w-0 flex-col"
    >
      <WorkflowEditorToolbar
        workspaceId={workflow.workspaceId}
        workflowId={workflow.id}
        name={workflow.name}
        initialStatus={workflow.status}
        responses={responses}
      />
      <div className="flex min-h-0 flex-1">
        <ReactFlowProvider>
          <NodePalette />
          <div className="min-w-0 flex-1">
            <WorkflowCanvas />
          </div>
          <ConfigPanel webhookSecret={webhookSecret} />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
