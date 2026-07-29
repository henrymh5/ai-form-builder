"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isAnswerableField } from "@/lib/form-schema/fields";
import type { WorkflowFormRef } from "@/lib/workflow-schema/validate";

/**
 * Field picker for the trigger's currently-selected forms — the option list
 * is the union of answerable fields across all of them, deduplicated by
 * field id. When two different fields (different ids) share the same
 * label, the form title is appended to disambiguate.
 */
export function FieldPicker({
  forms,
  value,
  onChange,
  placeholder = "Feld wählen",
}: {
  forms: WorkflowFormRef[];
  value: string | undefined;
  onChange: (fieldId: string) => void;
  placeholder?: string;
}) {
  const seen = new Map<string, { label: string; formTitles: string[] }>();
  for (const form of forms) {
    const fields = form.definition.pages.flatMap((p) => p.fields).filter(isAnswerableField);
    for (const field of fields) {
      if (!("label" in field)) continue;
      const existing = seen.get(field.id);
      if (existing) {
        existing.formTitles.push(form.title);
      } else {
        seen.set(field.id, { label: field.label, formTitles: [form.title] });
      }
    }
  }

  const labelCounts = new Map<string, number>();
  for (const { label } of seen.values()) {
    labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
  }

  const options = [...seen.entries()].map(([fieldId, { label, formTitles }]) => ({
    fieldId,
    display: (labelCounts.get(label) ?? 0) > 1 ? `${label} (${formTitles[0]})` : label,
  }));

  if (options.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Zuerst Formulare im Trigger auswählen" />
        </SelectTrigger>
        <SelectContent />
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(({ fieldId, display }) => (
          <SelectItem key={fieldId} value={fieldId}>
            {display}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Inserts `{{field:<id>}}` into a text value at the caller's current cursor — simplified to append at the end. */
export function insertFieldPlaceholder(current: string, fieldId: string): string {
  const separator = current.length > 0 && !current.endsWith(" ") ? " " : "";
  return `${current}${separator}{{field:${fieldId}}}`;
}
