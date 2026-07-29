import { generateId } from "./ids";
import type { Condition, Field, FormDefinition, Page } from "./schema";

/**
 * Duplicates a form definition (or a page/field within one) while assigning
 * fresh IDs to every duplicated entity and rewriting every reference
 * (conditions, jump targets) so they point at the new IDs — plan §6/§4.2.
 * IDs are never reused across a duplicate; this is the only place callers
 * should generate IDs when copying existing structures.
 */

interface IdMap {
  pages: Map<string, string>;
  fields: Map<string, string>;
  options: Map<string, string>;
  endings: Map<string, string>;
}

function cloneField(field: Field, idMap: IdMap): Field {
  const newFieldId = generateId("field");
  idMap.fields.set(field.id, newFieldId);

  if ("options" in field) {
    const options = field.options.map((option) => {
      const newOptionId = generateId("option");
      idMap.options.set(option.id, newOptionId);
      return { ...option, id: newOptionId };
    });
    return { ...field, id: newFieldId, options } as Field;
  }

  return { ...field, id: newFieldId };
}

function clonePage(page: Page, idMap: IdMap): Page {
  const newPageId = generateId("page");
  idMap.pages.set(page.id, newPageId);
  return {
    ...page,
    id: newPageId,
    fields: page.fields.map((field) => cloneField(field, idMap)),
  };
}

function remapCondition(condition: Condition, idMap: IdMap): Condition {
  return {
    ...condition,
    id: generateId("condition"),
    rules: condition.rules.map((rule) => ({
      ...rule,
      fieldId: idMap.fields.get(rule.fieldId) ?? rule.fieldId,
    })),
    targetId: condition.targetId
      ? (idMap.fields.get(condition.targetId) ??
        idMap.pages.get(condition.targetId) ??
        idMap.endings.get(condition.targetId) ??
        condition.targetId)
      : undefined,
  };
}

/**
 * Deep-clones a whole form definition with entirely new IDs. Used for
 * "Formular duplizieren" (plan §6/§4.1).
 */
export function cloneFormDefinition(definition: FormDefinition): FormDefinition {
  const idMap: IdMap = {
    pages: new Map(),
    fields: new Map(),
    options: new Map(),
    endings: new Map(),
  };

  const pages = definition.pages.map((page) => clonePage(page, idMap));
  const endings = definition.endings.map((ending) => {
    const newEndingId = generateId("ending");
    idMap.endings.set(ending.id, newEndingId);
    return { ...ending, id: newEndingId };
  });
  const conditions = definition.conditions.map((condition) => remapCondition(condition, idMap));

  return { ...definition, pages, endings, conditions };
}

/**
 * Clones a single page (with new IDs for the page and all its fields) for
 * insertion into a form. Conditions referencing fields on the source page
 * are NOT duplicated — a duplicated page starts with no conditions pointing
 * at it, avoiding ambiguous logic ownership (plan §6).
 */
export function clonePageWithNewIds(page: Page): Page {
  const idMap: IdMap = {
    pages: new Map(),
    fields: new Map(),
    options: new Map(),
    endings: new Map(),
  };
  return clonePage(page, idMap);
}

/** Clones a single field (with new IDs for the field and its options, if any). */
export function cloneFieldWithNewIds(field: Field): Field {
  const idMap: IdMap = {
    pages: new Map(),
    fields: new Map(),
    options: new Map(),
    endings: new Map(),
  };
  return cloneField(field, idMap);
}
