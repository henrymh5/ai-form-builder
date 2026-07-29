"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FormDefinition } from "@/lib/form-schema/schema";
import { isAnswerableField } from "@/lib/form-schema/fields";

/** Field picker scoped to answerable fields — used by condition rules and email recipient selection. */
export function FieldPicker({
  form,
  value,
  onChange,
  placeholder = "Feld wählen",
}: {
  form: FormDefinition;
  value: string | undefined;
  onChange: (fieldId: string) => void;
  placeholder?: string;
}) {
  const fields = form.pages.flatMap((p) => p.fields).filter(isAnswerableField);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {fields.map((field) =>
          "label" in field ? (
            <SelectItem key={field.id} value={field.id}>
              {field.label}
            </SelectItem>
          ) : null,
        )}
      </SelectContent>
    </Select>
  );
}

/** Inserts `{{field:<id>}}` into a text value at the caller's current cursor — simplified to append at the end. */
export function insertFieldPlaceholder(current: string, fieldId: string): string {
  const separator = current.length > 0 && !current.endsWith(" ") ? " " : "";
  return `${current}${separator}{{field:${fieldId}}}`;
}
