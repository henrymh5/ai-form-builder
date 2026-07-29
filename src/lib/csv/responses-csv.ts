import type { ExportableResponse, ResponseStatus } from "@/lib/db/repositories/responses";
import type { Field, FormDefinition } from "@/lib/form-schema/schema";
import { hasOptions } from "@/lib/form-schema/schema";
import { buildCsv, toCsvValue } from "@/lib/csv/serialize";

type AnswerableField = Exclude<Field, { type: "heading" | "paragraph" | "divider" | "hidden" }>;

function isAnswerable(field: Field): field is AnswerableField {
  return !["heading", "paragraph", "divider", "hidden"].includes(field.type);
}

const STATUS_LABEL: Record<ResponseStatus, string> = {
  completed: "Abgeschlossen",
  test: "Testantwort",
  spam: "Spam",
  archived: "Archiviert",
};

/** Resolves a choice-field value to its option label (falls back to the raw value if not found). */
function resolveDisplayValue(field: AnswerableField | undefined, value: unknown): unknown {
  if (!field || !hasOptions(field) || value === undefined || value === null) return value;
  const selected = Array.isArray(value) ? value : [value];
  return selected.map((v) => field.options.find((o) => o.value === v)?.label ?? v);
}

/**
 * Builds the CSV for a form's responses (plan §8/§14/§25 export). Columns
 * are the union of every answerable field across every version referenced
 * by the exported responses — keyed by field `id`, labeled with whichever
 * version last used that field — so a form whose questions changed over
 * time still exports one flat, sensible table instead of erroring or
 * silently dropping older columns.
 */
export function buildResponsesCsv(
  responses: ExportableResponse[],
  definitionByVersionId: Map<string, FormDefinition>,
): string {
  const fieldById = new Map<string, AnswerableField>();
  for (const definition of definitionByVersionId.values()) {
    for (const page of definition.pages) {
      for (const field of page.fields) {
        if (isAnswerable(field)) fieldById.set(field.id, field);
      }
    }
  }
  const fieldIds = [...fieldById.keys()];

  const headers = [
    "Eingang",
    "Status",
    "Bearbeitungszeit (s)",
    ...fieldIds.map((id) => fieldById.get(id)!.label),
  ];

  const rows = responses.map((response) => {
    const definition = definitionByVersionId.get(response.formVersionId);
    const answerByFieldId = new Map(response.answers.map((a) => [a.fieldId, a.value]));

    const baseCells = [
      new Date(response.submittedAt).toISOString(),
      STATUS_LABEL[response.status],
      response.durationMs !== null ? String(Math.round(response.durationMs / 1000)) : "",
    ];

    const fieldCells = fieldIds.map((fieldId) => {
      if (!answerByFieldId.has(fieldId)) return "";
      const field = definition?.pages.flatMap((p) => p.fields).find((f) => f.id === fieldId);
      const displayValue = resolveDisplayValue(
        field && isAnswerable(field) ? field : fieldById.get(fieldId),
        answerByFieldId.get(fieldId),
      );
      return toCsvValue(displayValue);
    });

    return [...baseCells, ...fieldCells];
  });

  return buildCsv(headers, rows);
}
