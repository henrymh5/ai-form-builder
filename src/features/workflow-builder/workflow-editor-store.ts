import { create } from "zustand";
import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import { generateWorkflowId } from "@/lib/workflow-schema/ids";
import { allowedHandlesFor, type WorkflowNode, type WorkflowNodeType } from "@/lib/workflow-schema/nodes";
import type { WorkflowDefinition } from "@/lib/workflow-schema/schema";
import { validateWorkflowDefinition, type WorkflowValidationResult } from "@/lib/workflow-schema/validate";
import type { FormDefinition } from "@/lib/form-schema/schema";
import { definitionToFlow, flowToDefinition, type FlowEdge, type FlowNode } from "./to-flow";

/**
 * Client-side owner of the workflow graph being edited — mirrors
 * form-builder/builder-store.ts's role, but deliberately has NO undo/redo
 * history and NO autosave (plan: an active workflow performs real side
 * effects, so edits only take effect on an explicit "Speichern"). `dirty`
 * drives the save button + unsaved-changes indicator.
 */

const DEFAULT_NODE_CONFIG: Record<Exclude<WorkflowNodeType, "trigger">, WorkflowNode["config"]> = {
  condition: { logic: "and", rules: [] },
  email: { to: "creator", subject: "Neue Formularantwort", body: "{{response:all}}" },
  webhook: { url: "https://", includeAnswers: true },
  responseAction: { action: "mark_read" },
  aiAction: { task: "summarize" },
};

const DEFAULT_NODE_LABEL_OFFSET: Record<WorkflowNodeType, { x: number; y: number }> = {
  trigger: { x: 0, y: 0 },
  condition: { x: 0, y: 160 },
  email: { x: 0, y: 160 },
  webhook: { x: 0, y: 160 },
  responseAction: { x: 0, y: 160 },
  aiAction: { x: 0, y: 160 },
};

interface WorkflowEditorState {
  workflowId: string | null;
  formId: string | null;
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId: string | null;
  dirty: boolean;
  saving: boolean;
  saveError: string | null;
  form: FormDefinition | null;

  load: (params: {
    workflowId: string;
    formId: string;
    definition: WorkflowDefinition;
    form: FormDefinition;
  }) => void;

  onNodesChange: (changes: NodeChange<FlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  addNode: (type: WorkflowNodeType, position: { x: number; y: number }) => string;
  updateNodeConfig: (nodeId: string, config: WorkflowNode["config"]) => void;
  removeNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;

  getDefinition: () => WorkflowDefinition;
  validate: () => WorkflowValidationResult;
  markSaved: () => void;
  setSaving: (saving: boolean) => void;
  setSaveError: (error: string | null) => void;
}

export const useWorkflowEditorStore = create<WorkflowEditorState>((set, get) => ({
  workflowId: null,
  formId: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  dirty: false,
  saving: false,
  saveError: null,
  form: null,

  load: ({ workflowId, formId, definition, form }) => {
    const { nodes, edges } = definitionToFlow(definition);
    set({
      workflowId,
      formId,
      nodes,
      edges,
      form,
      selectedNodeId: null,
      dirty: false,
      saveError: null,
    });
  },

  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
      dirty: state.dirty || changes.some((c) => c.type !== "select" && c.type !== "dimensions"),
    }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
      dirty: state.dirty || changes.some((c) => c.type !== "select"),
    }));
  },

  onConnect: (connection) => {
    if (!connection.source || !connection.target) return;
    const sourceHandle = (connection.sourceHandle ?? "out") as "out" | "true" | "false";

    set((state) => {
      const sourceNode = state.nodes.find((n) => n.id === connection.source);
      if (!sourceNode) return state;
      const allowed = allowedHandlesFor(sourceNode.data.type);
      if (!allowed.includes(sourceHandle)) return state;

      // At most one outgoing edge per handle (plan: v1 has no fan-out) —
      // replace any existing edge from the same source+handle.
      const withoutConflicting = state.edges.filter(
        (e) => !(e.source === connection.source && (e.sourceHandle ?? "out") === sourceHandle),
      );

      const newEdge: FlowEdge = {
        id: generateWorkflowId("edge"),
        source: connection.source!,
        target: connection.target!,
        sourceHandle: sourceHandle === "out" ? null : sourceHandle,
      };

      return { edges: [...withoutConflicting, newEdge], dirty: true };
    });
  },

  addNode: (type, position) => {
    const id = generateWorkflowId("node");
    const config =
      type === "trigger"
        ? { event: "response_submitted" as const }
        : DEFAULT_NODE_CONFIG[type];

    const newNode: FlowNode = {
      id,
      type,
      position,
      data: { id, type, position, config } as WorkflowNode,
    };

    set((state) => ({ nodes: [...state.nodes, newNode], dirty: true }));
    return id;
  },

  updateNodeConfig: (nodeId, config) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, config } as WorkflowNode }
          : node,
      ),
      dirty: true,
    }));
  },

  removeNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      dirty: true,
    }));
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  getDefinition: () => {
    const { nodes, edges } = get();
    return flowToDefinition(nodes, edges);
  },

  validate: () => {
    const { form } = get();
    return validateWorkflowDefinition(get().getDefinition(), form ?? undefined);
  },

  markSaved: () => set({ dirty: false, saving: false, saveError: null }),
  setSaving: (saving) => set({ saving }),
  setSaveError: (saveError) => set({ saveError, saving: false }),
}));

export function nextNodePosition(sourceNode: FlowNode): { x: number; y: number } {
  const offset = DEFAULT_NODE_LABEL_OFFSET[sourceNode.data.type];
  return { x: sourceNode.position.x + offset.x, y: sourceNode.position.y + offset.y };
}
