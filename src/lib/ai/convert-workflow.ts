import dagre from "@dagrejs/dagre";
import { AppError } from "@/lib/errors";
import { isAnswerableField } from "@/lib/form-schema/fields";
import type { FormDefinition } from "@/lib/form-schema/schema";
import { generateWorkflowId } from "@/lib/workflow-schema/ids";
import { CURRENT_WORKFLOW_SCHEMA_VERSION, type WorkflowDefinition, type WorkflowNode } from "@/lib/workflow-schema/schema";
import type { AiWorkflowNode, GenerateWorkflowOutput } from "@/lib/ai/workflow-schemas";

/**
 * Converts Claude's structured output into a real WorkflowDefinition —
 * mirrors lib/ai/convert.ts's role for forms: every ID is generated here,
 * never taken from the model, and every AI field-label reference is
 * resolved against the real form definition (an unresolvable label is a
 * hard AI_INVALID_OUTPUT, not silently dropped — plan §11 "Warum doppelt
 * validieren?" applies here too). A dagre auto-layout assigns node
 * positions since the AI output has none.
 */

const NODE_WIDTH = 224;
const NODE_HEIGHT = 90;

function labelToFieldId(form: FormDefinition, label: string): string | undefined {
  const fields = form.pages.flatMap((p) => p.fields).filter(isAnswerableField);
  const match = fields.find((f) => "label" in f && f.label.trim() === label.trim());
  return match?.id;
}

function requireFieldId(form: FormDefinition, label: string): string {
  const fieldId = labelToFieldId(form, label);
  if (!fieldId) {
    throw new AppError(
      "AI_INVALID_OUTPUT",
      `Die KI hat auf ein unbekanntes Formularfeld verwiesen: "${label}".`,
    );
  }
  return fieldId;
}

function toWorkflowNodeConfig(node: AiWorkflowNode, form: FormDefinition): WorkflowNode["config"] {
  switch (node.type) {
    case "condition":
      return {
        logic: node.logic,
        rules: node.rules.map((rule) => ({
          fieldId: requireFieldId(form, rule.fieldLabel),
          operator: rule.operator,
          value: rule.value,
        })),
      };
    case "email":
      return {
        to: node.to,
        submitterFieldId: node.submitterFieldLabel
          ? requireFieldId(form, node.submitterFieldLabel)
          : undefined,
        customTo: node.customTo,
        subject: node.subject,
        body: node.body,
      };
    case "webhook":
      return { url: node.url, includeAnswers: node.includeAnswers };
    case "responseAction":
      return { action: node.action, status: node.status, noteText: node.noteText };
    case "aiAction":
      return { task: node.task, categories: node.categories, targetLanguage: node.targetLanguage };
  }
}

/**
 * `formId` is the single form the AI generated this workflow against — it
 * becomes the trigger's sole selected form (`config.formIds = [formId]`).
 * The user can broaden the trigger's form selection afterward in the
 * editor; multi-form AI generation itself is out of v1 scope.
 */
export function toWorkflowDefinition(
  output: GenerateWorkflowOutput,
  form: FormDefinition,
  formId: string,
): WorkflowDefinition {
  const triggerId = generateWorkflowId("node");
  const idByRef = new Map<string, string>();
  for (const node of output.nodes) idByRef.set(node.ref, generateWorkflowId("node"));

  const nodes: WorkflowNode[] = [
    {
      id: triggerId,
      type: "trigger",
      position: { x: 0, y: 0 },
      config: { event: "response_submitted", formIds: [formId] },
    },
    ...output.nodes.map(
      (node): WorkflowNode =>
        ({
          id: idByRef.get(node.ref)!,
          type: node.type,
          position: { x: 0, y: 0 },
          config: toWorkflowNodeConfig(node, form),
        }) as WorkflowNode,
    ),
  ];

  const edges: WorkflowDefinition["edges"] = [];

  const refsWithIncoming = new Set(output.edges.map((e) => e.to));
  const firstRefs = output.nodes.filter((n) => !refsWithIncoming.has(n.ref));
  for (const node of firstRefs) {
    edges.push({
      id: generateWorkflowId("edge"),
      source: triggerId,
      target: idByRef.get(node.ref)!,
      sourceHandle: "out",
    });
  }

  for (const edge of output.edges) {
    const source = idByRef.get(edge.from);
    const target = idByRef.get(edge.to);
    if (!source || !target) {
      throw new AppError("AI_INVALID_OUTPUT", "Die KI hat eine ungültige Verbindung erzeugt.");
    }
    edges.push({
      id: generateWorkflowId("edge"),
      source,
      target,
      sourceHandle: edge.branch ?? "out",
    });
  }

  const layouted = layoutNodes(nodes, edges);

  return {
    schemaVersion: CURRENT_WORKFLOW_SCHEMA_VERSION,
    nodes: layouted,
    edges,
  };
}

function layoutNodes(
  nodes: WorkflowNode[],
  edges: WorkflowDefinition["edges"],
): WorkflowNode[] {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80 });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  return nodes.map((node) => {
    const position = graph.node(node.id);
    return {
      ...node,
      position: { x: position.x - NODE_WIDTH / 2, y: position.y - NODE_HEIGHT / 2 },
    } as WorkflowNode;
  });
}
