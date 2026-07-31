import type { FormDefinition } from "@/lib/form-schema/schema";
import { allowedHandlesFor, getTriggerConfig, type WorkflowEdge, type WorkflowNode } from "./nodes";
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
  | "TRIGGER_FORMS_REQUIRED_FOR_DIGEST"
  | "TRIGGER_UNKNOWN_FORM"
  | "SCHEDULE_CONFIG_INVALID"
  | "SCHEDULED_ONCE_IN_PAST"
  | "CYCLIC_GRAPH"
  | "UNREACHABLE_NODE"
  | "DUPLICATE_NODE_ID"
  | "EDGE_UNKNOWN_NODE"
  | "EDGE_INVALID_HANDLE"
  | "EDGE_HANDLE_ALREADY_USED"
  | "CONDITION_REFERENCES_UNKNOWN_FIELD"
  | "EMAIL_REFERENCES_UNKNOWN_FIELD"
  | "EMAIL_MISSING_RECIPIENT"
  | "FIELD_NOT_IN_ALL_FORMS"
  | "CONDITION_UNSUPPORTED_FOR_TRIGGER"
  | "EMAIL_RECIPIENT_UNSUPPORTED_FOR_TRIGGER"
  | "AI_TASK_UNSUPPORTED_FOR_TRIGGER"
  | "PLACEHOLDER_UNSUPPORTED_FOR_TRIGGER";

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
  const requiresDigestConsumers = new Set(["responseAction", "aiAction"]);
  const usesDigestPlaceholder = definition.nodes.some(
    (n) =>
      n.type === "email" &&
      extractPlaceholderTokens(n.config.subject + n.config.body).some((t) =>
        t.startsWith("digest:"),
      ),
  );

  for (const trigger of triggers) {
    if (trigger.type !== "trigger") continue;
    const { config } = trigger;

    const formIdsRequired =
      config.event === "response_submitted" ||
      config.event === "schedule" ||
      config.event === "scheduled_once";
    if (formIdsRequired && config.formIds.length === 0) {
      errors.push({
        code: "TRIGGER_NO_FORMS",
        message: "Der Trigger benötigt mindestens ein ausgewähltes Formular.",
        nodeId: trigger.id,
      });
    } else if (
      (config.event === "webhook_inbound" || config.event === "manual") &&
      config.formIds.length === 0 &&
      (definition.nodes.some((n) => requiresDigestConsumers.has(n.type)) || usesDigestPlaceholder)
    ) {
      errors.push({
        code: "TRIGGER_FORMS_REQUIRED_FOR_DIGEST",
        message:
          "Dieser Workflow verarbeitet Antworten (Antwort-Aktion, KI-Aktion oder {{digest:…}}) — dafür müssen Formulare ausgewählt sein.",
        nodeId: trigger.id,
      });
    } else if (knownFormIds) {
      for (const formId of config.formIds) {
        if (!knownFormIds.has(formId)) {
          warnings.push({
            code: "TRIGGER_UNKNOWN_FORM",
            message: "Der Trigger verweist auf ein gelöschtes oder unbekanntes Formular.",
            nodeId: trigger.id,
          });
        }
      }
    }

    if (config.event === "schedule") {
      const invalid =
        (config.frequency === "weekly" && config.weekday === undefined) ||
        (config.frequency === "monthly" && config.dayOfMonth === undefined);
      if (invalid) {
        errors.push({
          code: "SCHEDULE_CONFIG_INVALID",
          message:
            config.frequency === "weekly"
              ? "Für einen wöchentlichen Zeitplan muss ein Wochentag ausgewählt sein."
              : "Für einen monatlichen Zeitplan muss ein Tag im Monat ausgewählt sein.",
          nodeId: trigger.id,
        });
      }
    }

    if (config.event === "scheduled_once") {
      const runAt = new Date(config.runAt);
      if (!Number.isNaN(runAt.getTime()) && runAt <= new Date()) {
        errors.push({
          code: "SCHEDULED_ONCE_IN_PAST",
          message: "Der gewählte Zeitpunkt liegt in der Vergangenheit.",
          nodeId: trigger.id,
        });
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

/**
 * Checks node config against the trigger forms' field IDs (rules,
 * placeholders) — only meaningful under a `response_submitted` trigger,
 * where `{{field:…}}` and condition rules actually resolve against a real
 * response. Called only for that trigger event (see validateWorkflowDefinition).
 */
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

/**
 * Enforces which node configurations are hard-incompatible with the
 * trigger's event — these fail at runtime (interpreter throws), so they
 * must block enabling rather than just warn. `response_submitted` allows
 * everything; every other trigger forbids single-response-only constructs.
 */
function checkTriggerActionCompatibility(
  definition: WorkflowDefinition,
  issues: WorkflowValidationIssue[],
) {
  const triggerConfig = getTriggerConfig(definition.nodes);
  if (!triggerConfig || triggerConfig.event === "response_submitted") return;

  for (const node of definition.nodes) {
    if (node.type === "condition") {
      issues.push({
        code: "CONDITION_UNSUPPORTED_FOR_TRIGGER",
        message:
          "Bedingungen benötigen eine einzelne Antwort und funktionieren nur beim Trigger „Neue Formularantwort“.",
        nodeId: node.id,
      });
    }

    if (node.type === "email" && node.config.to === "submitter_field") {
      issues.push({
        code: "EMAIL_RECIPIENT_UNSUPPORTED_FOR_TRIGGER",
        message:
          "Empfängerfeld benötigt eine einzelne Antwort und funktioniert nur beim Trigger „Neue Formularantwort“.",
        nodeId: node.id,
      });
    }

    if (node.type === "aiAction" && node.config.task !== "summarize") {
      issues.push({
        code: "AI_TASK_UNSUPPORTED_FOR_TRIGGER",
        message:
          "Einordnen und Übersetzen benötigen eine einzelne Antwort und funktionieren nur beim Trigger „Neue Formularantwort“.",
        nodeId: node.id,
      });
    }
  }
}

/**
 * Warns about placeholders that will silently resolve to "" given the
 * trigger's event — a hard-fail config (checked above) is an error, but an
 * empty-output mismatch is just a warning (e.g. leaving a leftover
 * {{field:…}} in an email body after switching a workflow to a schedule
 * trigger).
 */
function checkPlaceholderCompatibility(
  definition: WorkflowDefinition,
  issues: WorkflowValidationIssue[],
) {
  const triggerConfig = getTriggerConfig(definition.nodes);
  if (!triggerConfig) return;
  const isResponseTrigger = triggerConfig.event === "response_submitted";
  const isWebhookTrigger = triggerConfig.event === "webhook_inbound";

  function checkText(text: string, nodeId: string) {
    for (const token of extractPlaceholderTokens(text)) {
      const isFieldOrResponseToken = token.startsWith("field:") || token.startsWith("response:");
      const isDigestToken = token.startsWith("digest:");
      const isPayloadToken = token.startsWith("payload:");

      if (isFieldOrResponseToken && !isResponseTrigger) {
        issues.push({
          code: "PLACEHOLDER_UNSUPPORTED_FOR_TRIGGER",
          message: `Der Platzhalter "{{${token}}}" liefert bei diesem Trigger keinen Wert (nur bei „Neue Formularantwort“).`,
          nodeId,
        });
      }
      if (isDigestToken && isResponseTrigger) {
        issues.push({
          code: "PLACEHOLDER_UNSUPPORTED_FOR_TRIGGER",
          message: `Der Platzhalter "{{${token}}}" liefert beim Trigger „Neue Formularantwort“ keinen Wert.`,
          nodeId,
        });
      }
      if (isPayloadToken && !isWebhookTrigger) {
        issues.push({
          code: "PLACEHOLDER_UNSUPPORTED_FOR_TRIGGER",
          message: `Der Platzhalter "{{${token}}}" liefert nur beim Trigger „Eingehender Webhook“ einen Wert.`,
          nodeId,
        });
      }
    }
  }

  for (const node of definition.nodes) {
    if (node.type === "email") checkText(node.config.subject + node.config.body, node.id);
    if (node.type === "responseAction" && node.config.noteText)
      checkText(node.config.noteText, node.id);
  }
}

const FIELD_PLACEHOLDER_PATTERN = /\{\{field:([^}]+)\}\}/g;
const ANY_PLACEHOLDER_PATTERN = /\{\{([a-z]+:[^}]*)\}\}/g;

export function extractFieldPlaceholders(text: string): string[] {
  return [...text.matchAll(FIELD_PLACEHOLDER_PATTERN)].map((m) => m[1]!.trim());
}

/** Extracts every `{{namespace:…}}` token (e.g. "field:fld_x", "digest:count") for cross-trigger-compatibility checks. */
export function extractPlaceholderTokens(text: string): string[] {
  return [...text.matchAll(ANY_PLACEHOLDER_PATTERN)].map((m) => m[1]!.trim());
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
  checkTriggerActionCompatibility(definition, errors);
  checkPlaceholderCompatibility(definition, warnings);

  const triggerConfig = getTriggerConfig(definition.nodes);
  if (forms && triggerConfig?.event === "response_submitted") {
    const triggerFormIds = new Set(triggerConfig.formIds);
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
