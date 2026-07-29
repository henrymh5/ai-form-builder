import type { Field } from "./fields";
import type { FormDefinition } from "./schema";

/**
 * Structural diff between two form definitions (plan §14 "Unterschiede
 * nachvollziehen") — keyed by stable field/page IDs, so a diff between the
 * current draft and an old published version is meaningful even after
 * reordering. Pure, no React/IO.
 */
export type FieldChangeKind = "added" | "removed" | "label_changed" | "required_changed" | "type_changed";

export interface FieldChange {
  kind: FieldChangeKind;
  fieldId: string;
  label: string;
  from?: string;
  to?: string;
}

export interface PageChange {
  kind: "added" | "removed";
  pageId: string;
  title: string;
}

export interface FormDiff {
  titleChanged: boolean;
  pageChanges: PageChange[];
  fieldChanges: FieldChange[];
}

function allFields(definition: FormDefinition): Map<string, Field> {
  return new Map(definition.pages.flatMap((p) => p.fields).map((f) => [f.id, f]));
}

function fieldLabel(field: Field): string {
  return "label" in field ? field.label : field.type;
}

export function diffFormDefinitions(before: FormDefinition, after: FormDefinition): FormDiff {
  const beforePages = new Map(before.pages.map((p, i) => [p.id, { page: p, index: i }]));
  const afterPages = new Map(after.pages.map((p, i) => [p.id, { page: p, index: i }]));

  const pageChanges: PageChange[] = [];
  for (const [id, { page }] of afterPages) {
    if (!beforePages.has(id)) {
      pageChanges.push({ kind: "added", pageId: id, title: page.title ?? "Seite" });
    }
  }
  for (const [id, { page }] of beforePages) {
    if (!afterPages.has(id)) {
      pageChanges.push({ kind: "removed", pageId: id, title: page.title ?? "Seite" });
    }
  }

  const beforeFields = allFields(before);
  const afterFields = allFields(after);
  const fieldChanges: FieldChange[] = [];

  for (const [id, field] of afterFields) {
    const previous = beforeFields.get(id);
    if (!previous) {
      fieldChanges.push({ kind: "added", fieldId: id, label: fieldLabel(field) });
      continue;
    }
    if (previous.type !== field.type) {
      fieldChanges.push({
        kind: "type_changed",
        fieldId: id,
        label: fieldLabel(field),
        from: previous.type,
        to: field.type,
      });
    }
    if ("label" in previous && "label" in field && previous.label !== field.label) {
      fieldChanges.push({
        kind: "label_changed",
        fieldId: id,
        label: fieldLabel(field),
        from: previous.label,
        to: field.label,
      });
    }
    if (
      "required" in previous &&
      "required" in field &&
      previous.required !== field.required
    ) {
      fieldChanges.push({
        kind: "required_changed",
        fieldId: id,
        label: fieldLabel(field),
        from: String(previous.required),
        to: String(field.required),
      });
    }
  }

  for (const [id, field] of beforeFields) {
    if (!afterFields.has(id)) {
      fieldChanges.push({ kind: "removed", fieldId: id, label: fieldLabel(field) });
    }
  }

  return {
    titleChanged: before.metadata.title !== after.metadata.title,
    pageChanges,
    fieldChanges,
  };
}

export function isDiffEmpty(diff: FormDiff): boolean {
  return !diff.titleChanged && diff.pageChanges.length === 0 && diff.fieldChanges.length === 0;
}
