import type { FormDefinition } from "@/lib/form-schema/schema";
import { allowedHandlesFor, type WorkflowEdge, type WorkflowNode } from "./nodes";
import type { WorkflowDefinition } from "./schema";

/**
 * Domain (fachliche) validation beyond what Zod's shape-check can express —
 * mirrors lib/form-schema/validate.ts. Runs after `workflowDefinitionSchema.parse()`
 * succeeds. Used by the editor's warning panel, the enable-toggle gate, and
 * the AI post-validation step.
 */

export type WorkflowValidationIssueCode =
  | "NO_TRIGGER"
  | "MULTIPLE_TRIGGERS"
  | "TRIGGER_HAS_INCOMING_EDGE"
  | "TRIGGER_NO_FORMS"
  | "TRIGGER_UNKNOWN_FORM"
  | "CYCLIC_GRAPH"
  | "UNREACHABLE_NODE"
  | "DUPLICATE_NODE_ID"
  | "EDGE_UNKNOWN_NODE"
  | "EDGE_INVALID_HANDLE"
  | "EDGE_HANDLE_ALREADY_USED"
  | "CONDITION_REFERENCES_UNKNOWN_FIELD"
  | "EMAIL_REFERENCES_UNKNOWN_FIELD"
  | "EMAIL_MISSING_RECIPIENT"
  | "FIELD_NOT_IN_ALL_FORMS";

/** A form the trigger can reference — just enough to resolve/validate field references. */
export interface WorkflowFormRef {
  id: string;
  title: string;
  definition: FormDefinition;
}

export interface WorkflowValidationIssue {
  code: WorkflowValidationIssueCode;
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface WorkflowValidationResult {
  errors: WorkflowValidationIssue[];
  warnings: WorkflowValidationIssue[];
}

function checkSingleTrigger(
  definition: WorkflowDefinition,
  errors: WorkflowValidationIssue[],
  warnings: WorkflowValidationIssue[],
  forms?: WorkflowFormRef[],
) {
  const triggers = definition.nodes.filter((n) => n.type === "trigger");
  if (triggers.length === 0) {
    errors.push({ code: "NO_TRIGGER", message: "Der Workflow benötigt einen Trigger-Knoten." });
  } else if (triggers.length > 1) {
    errors.push({
      code: "MULTIPLE_TRIGGERS",
      message: "Ein Workflow darf nur einen Trigger-Knoten haben.",
    });
  }

  const triggerIds = new Set(triggers.map((t) => t.id));
  for (const edge of definition.edges) {
    if (triggerIds.has(edge.target)) {
      errors.push({
        code: "TRIGGER_HAS_INCOMING_EDGE",
        message: "Der Trigger-Knoten darf keine eingehende Verbindung haben.",
        nodeId: edge.target,
        edgeId: edge.id,
      });
    }
  }

  const knownFormIds = forms ? new Set(forms.map((f) => f.id)) : undefined;
  for (const trigger of triggers) {
    if (trigger.type !== "trigger") continue;
    if (trigger.config.formIds.length === 0) {
      errors.push({
        code: "TRIGGER_NO_FORMS",
        message: "Der Trigger benötigt mindestens ein ausgewähltes Formular.",
        nodeId: trigger.id,
      });
    } else if (knownFormIds) {
      for (const formId of trigger.config.formIds) {
        if (!knownFormIds.has(formId)) {
          warnings.push({
            code: "TRIGGER_UNKNOWN_FORM",
            message: "Der Trigger verweist auf ein gelöschtes oder unbekanntes Formular.",
            nodeId: trigger.id,
          });
        }
      }
    }
  }
}

function checkDuplicateIds(definition: WorkflowDefinition, issues: WorkflowValidationIssue[]) {
  const seen = new Set<string>();
  for (const node of definition.nodes) {
    if (seen.has(node.id)) {
      issues.push({
        code: "DUPLICATE_NODE_ID",
        message: `Doppelte Knoten-ID: ${node.id}`,
        nodeId: node.id,
      });
    }
    seen.add(node.id);
  }
}

function checkEdges(definition: WorkflowDefinition, issues: WorkflowValidationIssue[]) {
  const nodeById = new Map(definition.nodes.map((n) => [n.id, n]));
  const usedHandles = new Set<string>();

  for (const edge of definition.edges) {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);

    if (!source || !target) {
      issues.push({
        code: "EDGE_UNKNOWN_NODE",
        message: "Verbindung verweist auf einen unbekannten Knoten.",
        edgeId: edge.id,
      });
      continue;
    }

    const allowed = allowedHandlesFor(source.type);
    if (!allowed.includes(edge.sourceHandle)) {
      issues.push({
        code: "EDGE_INVALID_HANDLE",
        message: `Knotentyp "${source.type}" unterstützt keinen Ausgang "${edge.sourceHandle}".`,
        nodeId: source.id,
        edgeId: edge.id,
      });
      continue;
    }

    const handleKey = `${edge.source}:${edge.sourceHandle}`;
    if (usedHandles.has(handleKey)) {
      issues.push({
        code: "EDGE_HANDLE_ALREADY_USED",
        message: "Von diesem Ausgang darf nur eine Verbindung ausgehen.",
        nodeId: source.id,
        edgeId: edge.id,
      });
      continue;
    }
    usedHandles.add(handleKey);
  }
}

function buildAdjacency(definition: WorkflowDefinition): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  for (const node of definition.nodes) adjacency.set(node.id, []);
  for (const edge of definition.edges) {
    if (!adjacency.has(edge.source)) continue;
    adjacency.get(edge.source)!.push(edge.target);
  }
  return adjacency;
}

function checkAcyclic(definition: WorkflowDefinition, issues: WorkflowValidationIssue[]) {
  const adjacency = buildAdjacency(definition);
  const color = new Map<string, "white" | "gray" | "black">();
  for (const node of definition.nodes) color.set(node.id, "white");

  function visit(nodeId: string): boolean {
    color.set(nodeId, "gray");
    for (const next of adjacency.get(nodeId) ?? []) {
      const nextColor = color.get(next);
      if (nextColor === "gray") return true;
      if (nextColor === "white" && visit(next)) return true;
    }
    color.set(nodeId, "black");
    return false;
  }

  for (const node of definition.nodes) {
    if (color.get(node.id) === "white" && visit(node.id)) {
      issues.push({
        code: "CYCLIC_GRAPH",
        message: "Die Verbindungen erzeugen einen zyklischen Ablauf.",
      });
      return;
    }
  }
}

function checkReachability(definition: WorkflowDefinition, issues: WorkflowValidationIssue[]) {
  const trigger = definition.nodes.find((n) => n.type === "trigger");
  if (!trigger) return; // already reported by checkSingleTrigger

  const adjacency = buildAdjacency(definition);
  const visited = new Set<string>([trigger.id]);
  const queue = [trigger.id];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of adjacency.get(current) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }

  for (const node of definition.nodes) {
    if (!visited.has(node.id)) {
      issues.push({
        code: "UNREACHABLE_NODE",
        message: "Dieser Knoten ist vom Trigger aus nicht erreichbar.",
        nodeId: node.id,
      });
    }
  }
}

function fieldIdsIn(form: FormDefinition): Set<string> {
  return new Set(form.pages.flatMap((p) => p.fields.map((f) => f.id)));
}

/**
 * Checks a field reference against the trigger's forms. A reference is
 * fully valid only if every trigger form has that field — a field present
 * in some but not all is a warning (the runtime degrades gracefully:
 * evaluateRule treats a missing field as unanswered/false, so a submission
 * from a form lacking the field just never matches that rule), while a
 * field present in none is the existing hard "unknown field" issue.
 */
function checkFieldReference(
  fieldId: string,
  forms: WorkflowFormRef[],
  onUnknown: () => void,
  onPartial: (formsWithout: string[]) => void,
): void {
  const formsWithout = forms
    .filter((f) => !fieldIdsIn(f.definition).has(fieldId))
    .map((f) => f.title);
  if (formsWithout.length === forms.length) {
    onUnknown();
  } else if (formsWithout.length > 0) {
    onPartial(formsWithout);
  }
}

/** Checks node config against the trigger forms' field IDs (rules, placeholders). */
function checkFieldReferences(
  definition: WorkflowDefinition,
  forms: WorkflowFormRef[],
  issues: WorkflowValidationIssue[],
) {
  if (forms.length === 0) return;

  for (const node of definition.nodes) {
    if (node.type === "condition") {
      for (const rule of node.config.rules) {
        checkFieldReference(
          rule.fieldId,
          forms,
          () =>
            issues.push({
              code: "CONDITION_REFERENCES_UNKNOWN_FIELD",
              message: `Bedingung verweist auf ein gelöschtes oder unbekanntes Feld: ${rule.fieldId}`,
              nodeId: node.id,
            }),
          (formsWithout) =>
            issues.push({
              code: "FIELD_NOT_IN_ALL_FORMS",
              message: `Bedingung verweist auf ein Feld, das in folgenden Trigger-Formularen fehlt: ${formsWithout.join(", ")}.`,
              nodeId: node.id,
            }),
        );
      }
    }

    if (node.type === "email") {
      if (node.config.to === "submitter_field") {
        if (!node.config.submitterFieldId) {
          issues.push({
            code: "EMAIL_MISSING_RECIPIENT",
            message: "E-Mail-Aktion benötigt ein Empfängerfeld.",
            nodeId: node.id,
          });
        } else {
          checkFieldReference(
            node.config.submitterFieldId,
            forms,
            () =>
              issues.push({
                code: "EMAIL_REFERENCES_UNKNOWN_FIELD",
                message: `E-Mail-Aktion verweist auf ein gelöschtes oder unbekanntes Feld: ${node.config.submitterFieldId}`,
                nodeId: node.id,
              }),
            (formsWithout) =>
              issues.push({
                code: "FIELD_NOT_IN_ALL_FORMS",
                message: `E-Mail-Aktion verweist auf ein Feld, das in folgenden Trigger-Formularen fehlt: ${formsWithout.join(", ")}.`,
                nodeId: node.id,
              }),
          );
        }
      }
      if (node.config.to === "custom" && !node.config.customTo) {
        issues.push({
          code: "EMAIL_MISSING_RECIPIENT",
          message: "E-Mail-Aktion benötigt eine feste Empfängeradresse.",
          nodeId: node.id,
        });
      }

      for (const placeholder of extractFieldPlaceholders(node.config.subject + node.config.body)) {
        checkFieldReference(
          placeholder,
          forms,
          () =>
            issues.push({
              code: "EMAIL_REFERENCES_UNKNOWN_FIELD",
              message: `E-Mail-Text verweist auf ein gelöschtes oder unbekanntes Feld: ${placeholder}`,
              nodeId: node.id,
            }),
          (formsWithout) =>
            issues.push({
              code: "FIELD_NOT_IN_ALL_FORMS",
              message: `E-Mail-Text verweist auf ein Feld, das in folgenden Trigger-Formularen fehlt: ${formsWithout.join(", ")}.`,
              nodeId: node.id,
            }),
        );
      }
    }
  }
}

const FIELD_PLACEHOLDER_PATTERN = /\{\{field:([^}]+)\}\}/g;

export function extractFieldPlaceholders(text: string): string[] {
  return [...text.matchAll(FIELD_PLACEHOLDER_PATTERN)].map((m) => m[1]!.trim());
}

/**
 * Validates a workflow definition's business rules. `forms` is optional so
 * structural checks can run standalone (e.g. immediately after AI
 * generation, before any form is loaded) — form-reference and field-
 * reference checks are skipped (not the trigger-has-no-forms check, which
 * is always enforced) when omitted. When provided, `forms` should be the
 * full set the caller can resolve (e.g. the workspace's forms) — this
 * function filters it down to the trigger's selected `formIds` itself.
 */
export function validateWorkflowDefinition(
  definition: WorkflowDefinition,
  forms?: WorkflowFormRef[],
): WorkflowValidationResult {
  const errors: WorkflowValidationIssue[] = [];
  const warnings: WorkflowValidationIssue[] = [];

  checkSingleTrigger(definition, errors, warnings, forms);
  checkDuplicateIds(definition, errors);
  checkEdges(definition, errors);
  checkAcyclic(definition, errors);
  checkReachability(definition, warnings);

  if (forms) {
    const trigger = definition.nodes.find((n) => n.type === "trigger");
    const triggerFormIds =
      trigger?.type === "trigger" ? new Set(trigger.config.formIds) : new Set();
    const triggerForms = forms.filter((f) => triggerFormIds.has(f.id));
    checkFieldReferences(definition, triggerForms, warnings);
  }

  return { errors, warnings };
}

export function isWorkflowValid(result: WorkflowValidationResult): boolean {
  return result.errors.length === 0;
}

// Re-exported for consumers that only need node/edge types alongside validation.
export type { WorkflowNode, WorkflowEdge };
