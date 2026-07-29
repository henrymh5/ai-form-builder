"use client";

import { useCallback, useRef } from "react";
import { Background, Controls, ReactFlow, type ReactFlowInstance } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nodeTypes } from "./node-types";
import { PALETTE_DRAG_MIME } from "./node-palette";
import { useWorkflowEditorStore } from "./workflow-editor-store";
import type { FlowEdge, FlowNode } from "./to-flow";
import type { WorkflowNodeType } from "@/lib/workflow-schema/schema";

/** The React Flow canvas — drop target for the palette, wires store mutations to onNodesChange/onEdgesChange/onConnect. */
export function WorkflowCanvas() {
  const nodes = useWorkflowEditorStore((s) => s.nodes);
  const edges = useWorkflowEditorStore((s) => s.edges);
  const onNodesChange = useWorkflowEditorStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkflowEditorStore((s) => s.onEdgesChange);
  const onConnect = useWorkflowEditorStore((s) => s.onConnect);
  const addNode = useWorkflowEditorStore((s) => s.addNode);
  const selectNode = useWorkflowEditorStore((s) => s.selectNode);

  const reactFlowInstanceRef = useRef<ReactFlowInstance<FlowNode, FlowEdge> | null>(null);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData(PALETTE_DRAG_MIME) as WorkflowNodeType | "";
      if (!type || !reactFlowInstanceRef.current) return;

      const position = reactFlowInstanceRef.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const nodeId = addNode(type, position);
      selectNode(nodeId);
    },
    [addNode, selectNode],
  );

  return (
    <div className="bg-surface-subtle h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={(instance) => {
          reactFlowInstanceRef.current = instance;
        }}
        onNodeClick={(_, node) => selectNode(node.id)}
        onPaneClick={() => selectNode(null)}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} className="!bg-surface-subtle" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
