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
import {
  validateWorkflowDefinition,
  type WorkflowFormRef,
  type WorkflowValidationResult,
} from "@/lib/workflow-schema/validate";
import { definitionToFlow, flowToDefinition, type FlowEdge, type FlowNode } from "./to-flow";

/**
 * Client-side owner of the workflow graph being edited — mirrors
 * form-builder/builder-store.ts's role, but deliberately has NO undo/redo
 * history and NO autosave (plan: an active workflow performs real side
 * effects, so edits only take effect on an explicit "Speichern"). `dirty`
 * drives the save button + unsaved-changes indicator.
 *
 * `forms` holds every form the current workspace could pick as a trigger —
 * NOT just the ones currently selected — so the trigger config panel can
 * offer the full checkbox list. Field pickers elsewhere derive the
 * trigger's currently-selected subset via `getTriggerFormRefs()`.
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
  workspaceId: string | null;
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId: string | null;
  dirty: boolean;
  saving: boolean;
  saveError: string | null;
  /** All forms in the workspace, available for the trigger's form selection. */
  forms: WorkflowFormRef[];

  load: (params: {
    workflowId: string;
    workspaceId: string;
    definition: WorkflowDefinition;
    forms: WorkflowFormRef[];
  }) => void;

  onNodesChange: (changes: NodeChange<FlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  addNode: (type: WorkflowNodeType, position: { x: number; y: number }) => string;
  updateNodeConfig: (nodeId: string, config: WorkflowNode["config"]) => void;
  removeNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;

  /** The forms currently selected in the trigger node's config.formIds. */
  getTriggerFormRefs: () => WorkflowFormRef[];
  getDefinition: () => WorkflowDefinition;
  validate: () => WorkflowValidationResult;
  markSaved: () => void;
  setSaving: (saving: boolean) => void;
  setSaveError: (error: string | null) => void;
}

export const useWorkflowEditorStore = create<WorkflowEditorState>((set, get) => ({
  workflowId: null,
  workspaceId: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  dirty: false,
  saving: false,
  saveError: null,
  forms: [],

  load: ({ workflowId, workspaceId, definition, forms }) => {
    const { nodes, edges } = definitionToFlow(definition);
    set({
      workflowId,
      workspaceId,
      nodes,
      edges,
      forms,
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
        ? { event: "response_submitted" as const, formIds: [] }
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

  getTriggerFormRefs: () => {
    const { nodes, forms } = get();
    const trigger = nodes.find((n) => n.data.type === "trigger");
    if (!trigger || trigger.data.type !== "trigger") return [];
    const selected = new Set(trigger.data.config.formIds);
    return forms.filter((f) => selected.has(f.id));
  },

  getDefinition: () => {
    const { nodes, edges } = get();
    return flowToDefinition(nodes, edges);
  },

  validate: () => {
    const { forms } = get();
    return validateWorkflowDefinition(get().getDefinition(), forms);
  },

  markSaved: () => set({ dirty: false, saving: false, saveError: null }),
  setSaving: (saving) => set({ saving }),
  setSaveError: (saveError) => set({ saveError, saving: false }),
}));

export function nextNodePosition(sourceNode: FlowNode): { x: number; y: number } {
  const offset = DEFAULT_NODE_LABEL_OFFSET[sourceNode.data.type];
  return { x: sourceNode.position.x + offset.x, y: sourceNode.position.y + offset.y };
}
