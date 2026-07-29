import type { Condition, Field, FormDefinition, Option, Page } from "./schema";

/**
 * Domain (fachliche) validation beyond what Zod's shape-check can express —
 * plan §4.3. Runs after `formDefinitionSchema.parse()` succeeds. Used by the
 * publish gate, the AI post-validation step, and the Builder warning panel.
 */

export type ValidationIssueCode =
  | "TOO_MANY_FIELDS"
  | "TOO_MANY_PAGES"
  | "TOO_MANY_CONDITIONS"
  | "TOO_MANY_OPTIONS"
  | "DUPLICATE_FIELD_ID"
  | "DUPLICATE_FIELD_KEY"
  | "DUPLICATE_PAGE_ID"
  | "DUPLICATE_OPTION_VALUE"
  | "DUPLICATE_ENDING_ID"
  | "MISSING_DEFAULT_ENDING"
  | "MULTIPLE_DEFAULT_ENDINGS"
  | "CONDITION_REFERENCES_UNKNOWN_FIELD"
  | "CONDITION_REFERENCES_UNKNOWN_TARGET"
  | "CONDITION_TARGET_TYPE_MISMATCH"
  | "JUMP_TARGETS_OWN_PAGE"
  | "CYCLIC_LOGIC"
  | "UNREACHABLE_PAGE"
  | "PATH_WITHOUT_ENDING";

export interface ValidationIssue {
  code: ValidationIssueCode;
  message: string;
  /** Best-effort pointer to the offending entity, for the Builder warning panel. */
  path?: { pageId?: string; fieldId?: string; conditionId?: string };
}

export interface ValidationResult {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

// Limits — plan §4.3 / §12 KI-Nachvalidierung.
export const MAX_FIELDS_TOTAL = 50;
export const MAX_OPTIONS_PER_FIELD = 20;
export const MAX_PAGES_TOTAL = 30;
export const MAX_CONDITIONS_TOTAL = 50;

/**
 * Graph analyses (cycle detection, unreachable pages, path-without-ending)
 * live in the Logic Engine (Phase 2) — this function does not know how to
 * evaluate conditional navigation. `validateFormDefinition` accepts an
 * optional `graphAnalysis` implementation so structural validation can run
 * standalone in Phase 1, and Phase 2 wires the real Logic Engine in without
 * changing this module.
 */
export interface GraphAnalysis {
  detectCycles(definition: FormDefinition): { cyclePageIds: string[] }[];
  findUnreachablePages(definition: FormDefinition): string[];
  /** Page IDs reachable from the start for which no ending is guaranteed. */
  findPathsWithoutEnding(definition: FormDefinition): string[];
}

function allFields(definition: FormDefinition): Field[] {
  return definition.pages.flatMap((page) => page.fields);
}

function fieldsWithKey(definition: FormDefinition): Extract<Field, { key: string }>[] {
  return allFields(definition).filter((f): f is Extract<Field, { key: string }> => "key" in f);
}

function optionsOf(field: Field): Option[] {
  return "options" in field ? field.options : [];
}

/** Human-readable label for messages — `divider` fields have no `label`. */
function fieldLabel(field: Field): string {
  return "label" in field ? field.label : "(Trennbereich)";
}

function checkLimits(definition: FormDefinition, issues: ValidationIssue[]): void {
  const fields = allFields(definition);
  if (fields.length > MAX_FIELDS_TOTAL) {
    issues.push({
      code: "TOO_MANY_FIELDS",
      message: `Formular enthält ${fields.length} Felder, erlaubt sind maximal ${MAX_FIELDS_TOTAL}.`,
    });
  }
  if (definition.pages.length > MAX_PAGES_TOTAL) {
    issues.push({
      code: "TOO_MANY_PAGES",
      message: `Formular enthält ${definition.pages.length} Seiten, erlaubt sind maximal ${MAX_PAGES_TOTAL}.`,
    });
  }
  if (definition.conditions.length > MAX_CONDITIONS_TOTAL) {
    issues.push({
      code: "TOO_MANY_CONDITIONS",
      message: `Formular enthält ${definition.conditions.length} Bedingungen, erlaubt sind maximal ${MAX_CONDITIONS_TOTAL}.`,
    });
  }
  for (const field of fields) {
    const options = optionsOf(field);
    if (options.length > MAX_OPTIONS_PER_FIELD) {
      issues.push({
        code: "TOO_MANY_OPTIONS",
        message: `Feld "${fieldLabel(field)}" hat ${options.length} Optionen, erlaubt sind maximal ${MAX_OPTIONS_PER_FIELD}.`,
        path: { fieldId: field.id },
      });
    }
  }
}

function checkUniqueness(definition: FormDefinition, issues: ValidationIssue[]): void {
  const fields = allFields(definition);

  const fieldIds = new Set<string>();
  for (const field of fields) {
    if (fieldIds.has(field.id)) {
      issues.push({
        code: "DUPLICATE_FIELD_ID",
        message: `Doppelte Feld-ID: ${field.id}`,
        path: { fieldId: field.id },
      });
    }
    fieldIds.add(field.id);
  }

  const fieldKeys = new Set<string>();
  for (const field of fieldsWithKey(definition)) {
    if (fieldKeys.has(field.key)) {
      issues.push({
        code: "DUPLICATE_FIELD_KEY",
        message: `Doppelter interner Feldname: ${field.key}`,
        path: { fieldId: field.id },
      });
    }
    fieldKeys.add(field.key);
  }

  const pageIds = new Set<string>();
  for (const page of definition.pages) {
    if (pageIds.has(page.id)) {
      issues.push({
        code: "DUPLICATE_PAGE_ID",
        message: `Doppelte Seiten-ID: ${page.id}`,
        path: { pageId: page.id },
      });
    }
    pageIds.add(page.id);
  }

  const endingIds = new Set<string>();
  for (const ending of definition.endings) {
    if (endingIds.has(ending.id)) {
      issues.push({
        code: "DUPLICATE_ENDING_ID",
        message: `Doppelte Abschlussseiten-ID: ${ending.id}`,
      });
    }
    endingIds.add(ending.id);
  }

  for (const field of fields) {
    const options = optionsOf(field);
    const values = new Set<string>();
    for (const option of options) {
      if (values.has(option.value)) {
        issues.push({
          code: "DUPLICATE_OPTION_VALUE",
          message: `Feld "${fieldLabel(field)}" hat doppelten Optionswert: ${option.value}`,
          path: { fieldId: field.id },
        });
      }
      values.add(option.value);
    }
  }
}

function checkEndings(definition: FormDefinition, issues: ValidationIssue[]): void {
  const defaults = definition.endings.filter((e) => e.isDefault);
  if (defaults.length === 0) {
    issues.push({
      code: "MISSING_DEFAULT_ENDING",
      message: "Es muss genau eine Standard-Abschlussseite geben.",
    });
  } else if (defaults.length > 1) {
    issues.push({
      code: "MULTIPLE_DEFAULT_ENDINGS",
      message: "Es darf nur eine Standard-Abschlussseite geben.",
    });
  }
}

function checkReferences(definition: FormDefinition, issues: ValidationIssue[]): void {
  const fieldIds = new Set(allFields(definition).map((f) => f.id));
  const pageIds = new Set(definition.pages.map((p) => p.id));
  const endingIds = new Set(definition.endings.map((e) => e.id));

  const targetKindByAction: Record<Condition["action"], "field" | "page" | "ending"> = {
    show_field: "field",
    hide_field: "field",
    show_page: "page",
    skip_page: "page",
    jump_to_page: "page",
    end_form: "ending",
  };

  for (const condition of definition.conditions) {
    for (const rule of condition.rules) {
      if (!fieldIds.has(rule.fieldId)) {
        issues.push({
          code: "CONDITION_REFERENCES_UNKNOWN_FIELD",
          message: `Bedingung verweist auf ein gelöschtes oder unbekanntes Feld: ${rule.fieldId}`,
          path: { conditionId: condition.id },
        });
      }
    }

    if (condition.targetId) {
      const expectedKind = targetKindByAction[condition.action];
      const idsForKind =
        expectedKind === "field" ? fieldIds : expectedKind === "page" ? pageIds : endingIds;

      if (!idsForKind.has(condition.targetId)) {
        // Could exist as a different kind of entity — distinguish "unknown" vs "wrong kind".
        const existsAsOtherKind =
          fieldIds.has(condition.targetId) ||
          pageIds.has(condition.targetId) ||
          endingIds.has(condition.targetId);
        issues.push({
          code: existsAsOtherKind
            ? "CONDITION_TARGET_TYPE_MISMATCH"
            : "CONDITION_REFERENCES_UNKNOWN_TARGET",
          message: existsAsOtherKind
            ? `Bedingung "${condition.action}" verweist auf ein Ziel des falschen Typs: ${condition.targetId}`
            : `Bedingung verweist auf ein gelöschtes oder unbekanntes Ziel: ${condition.targetId}`,
          path: { conditionId: condition.id },
        });
      }
    }

    if (condition.action === "jump_to_page" && condition.targetId) {
      const ownerPage = definition.pages.find((page: Page) =>
        page.fields.some((f) => condition.rules.some((r) => r.fieldId === f.id)),
      );
      if (ownerPage && ownerPage.id === condition.targetId) {
        issues.push({
          code: "JUMP_TARGETS_OWN_PAGE",
          message: "Ein Sprung darf nicht auf die eigene Seite verweisen.",
          path: { conditionId: condition.id, pageId: ownerPage.id },
        });
      }
    }
  }
}

/**
 * Validates a form definition's business rules. `graphAnalysis` is optional
 * so this runs standalone before the Logic Engine exists (Phase 1); Phase 2
 * wires in the real cycle/reachability checks.
 */
export function validateFormDefinition(
  definition: FormDefinition,
  graphAnalysis?: GraphAnalysis,
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  checkLimits(definition, errors);
  checkUniqueness(definition, errors);
  checkEndings(definition, errors);
  checkReferences(definition, errors);

  if (graphAnalysis) {
    const cycles = graphAnalysis.detectCycles(definition);
    for (const cycle of cycles) {
      errors.push({
        code: "CYCLIC_LOGIC",
        message: "Die Regeln erzeugen einen zyklischen Ablauf.",
        path: { pageId: cycle.cyclePageIds[0] },
      });
    }

    for (const pageId of graphAnalysis.findUnreachablePages(definition)) {
      warnings.push({
        code: "UNREACHABLE_PAGE",
        message: "Diese Seite ist nicht erreichbar.",
        path: { pageId },
      });
    }

    for (const pageId of graphAnalysis.findPathsWithoutEnding(definition)) {
      warnings.push({
        code: "PATH_WITHOUT_ENDING",
        message: "Für diesen Antwortpfad existiert keine Abschlussseite.",
        path: { pageId },
      });
    }
  }

  return { errors, warnings };
}

/** True when validation found no blocking errors (warnings are non-blocking). */
export function isValid(result: ValidationResult): boolean {
  return result.errors.length === 0;
}
