import type { Edge, Node } from "@xyflow/react";
import type { WorkflowDefinition, WorkflowNode } from "@/lib/workflow-schema/schema";

/**
 * Converts between the canonical WorkflowDefinition (persisted, React-Flow-
 * agnostic) and React Flow's own node/edge shape. Kept as pure functions so
 * the editor store and any future consumer (e.g. a read-only run-history
 * mini-map) share one conversion, matching the plan's rule that Builder and
 * renderer never re-implement the same mapping twice.
 */

export type FlowNode = Node<WorkflowNode>;
export type FlowEdge = Edge;

export function definitionToFlow(definition: WorkflowDefinition): {
  nodes: FlowNode[];
  edges: FlowEdge[];
} {
  const nodes: FlowNode[] = definition.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node,
  }));

  const edges: FlowEdge[] = definition.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle === "out" ? null : edge.sourceHandle,
  }));

  return { nodes, edges };
}

export function flowToDefinition(nodes: FlowNode[], edges: FlowEdge[]): WorkflowDefinition {
  return {
    schemaVersion: 1,
    nodes: nodes.map((node) => ({
      ...node.data,
      position: node.position,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: (edge.sourceHandle ?? "out") as "out" | "true" | "false",
    })),
  };
}
