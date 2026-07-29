import type { Field, FormDefinition } from "@/lib/form-schema/schema";
import { evaluateCondition, type AnswerMap } from "./evaluate";

/**
 * Field/page visibility — plan §9.2. Default visibility is "visible" for
 * every field/page unless a matching condition says otherwise. When both a
 * show and a hide condition match the same target, `hide` wins (safer
 * default: show less, not more, when logic is ambiguous).
 */

function allFieldIds(definition: FormDefinition): Set<string> {
  return new Set(definition.pages.flatMap((page) => page.fields.map((f) => f.id)));
}

function allPageIds(definition: FormDefinition): Set<string> {
  return new Set(definition.pages.map((p) => p.id));
}

/** Returns the set of field IDs currently visible, given the current answers. */
export function getFieldVisibility(definition: FormDefinition, answers: AnswerMap): Set<string> {
  const visible = allFieldIds(definition);

  for (const condition of definition.conditions) {
    if (condition.action !== "show_field" && condition.action !== "hide_field") continue;
    if (!condition.targetId) continue;
    const matches = evaluateCondition(condition, answers);

    if (condition.action === "hide_field" && matches) {
      visible.delete(condition.targetId);
    }
    if (condition.action === "show_field" && !matches) {
      visible.delete(condition.targetId);
    }
  }

  // Re-apply: hide always wins over show for the same target in the same pass.
  for (const condition of definition.conditions) {
    if (condition.action !== "hide_field" || !condition.targetId) continue;
    if (evaluateCondition(condition, answers)) {
      visible.delete(condition.targetId);
    }
  }

  return visible;
}

/** Returns the set of page IDs currently visible, given the current answers. */
export function getPageVisibility(definition: FormDefinition, answers: AnswerMap): Set<string> {
  const visible = allPageIds(definition);

  for (const condition of definition.conditions) {
    if (condition.action !== "show_page" && condition.action !== "skip_page") continue;
    if (!condition.targetId) continue;
    const matches = evaluateCondition(condition, answers);

    if (condition.action === "skip_page" && matches) {
      visible.delete(condition.targetId);
    }
    if (condition.action === "show_page" && !matches) {
      visible.delete(condition.targetId);
    }
  }

  // hide (skip) always wins over show for the same target.
  for (const condition of definition.conditions) {
    if (condition.action !== "skip_page" || !condition.targetId) continue;
    if (evaluateCondition(condition, answers)) {
      visible.delete(condition.targetId);
    }
  }

  return visible;
}

function fieldById(definition: FormDefinition, fieldId: string): Field | undefined {
  for (const page of definition.pages) {
    const field = page.fields.find((f) => f.id === fieldId);
    if (field) return field;
  }
  return undefined;
}

/**
 * Removes answers for fields that are no longer visible, applied to a
 * fixpoint (removing one answer can change downstream visibility, e.g. when
 * a condition's own trigger field becomes hidden — plan §9.2). Never
 * mutates the input map.
 */
export function pruneHiddenAnswers(definition: FormDefinition, answers: AnswerMap): AnswerMap {
  let current = answers;

  // Bounded by field count — cannot loop more times than there are fields,
  // since each iteration either removes at least one answer or stabilizes.
  const maxIterations = definition.pages.reduce((n, p) => n + p.fields.length, 0) + 1;

  for (let i = 0; i < maxIterations; i++) {
    const visibleFieldIds = getFieldVisibility(definition, current);
    const next: AnswerMap = {};
    let changed = false;

    for (const [fieldId, value] of Object.entries(current)) {
      const field = fieldById(definition, fieldId);
      // Keep answers for fields not in the definition (e.g. hidden/system
      // fields not modeled here) untouched — only prune known, hidden fields.
      if (field && !visibleFieldIds.has(fieldId)) {
        changed = true;
        continue;
      }
      next[fieldId] = value;
    }

    current = next;
    if (!changed) break;
  }

  return current;
}
