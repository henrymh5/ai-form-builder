import type { RunContext } from "./context";

/**
 * Placeholder resolution for email subjects/bodies and note text —
 * `{{field:<fieldId>}}` plus a handful of special tokens. IDs (not labels)
 * are used because labels are not stable/unique — the editor's field picker
 * inserts the ID syntax so users never type it by hand.
 */

const FIELD_PLACEHOLDER = /\{\{field:([^}]+)\}\}/g;
const SPECIAL_PLACEHOLDER = /\{\{(form:title|response:id|response:submittedAt|response:all)\}\}/g;

function formatAnswerValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Ja" : "Nein";
  return String(value);
}

function formatAllAnswers(ctx: RunContext): string {
  return ctx.rawAnswers
    .map((a) => {
      const field = ctx.form.pages.flatMap((p) => p.fields).find((f) => f.id === a.fieldId);
      const label = field && "label" in field ? field.label : a.fieldId;
      return `${label}: ${formatAnswerValue(a.value)}`;
    })
    .join("\n");
}

/** Resolves all placeholders in `template` against the run context. Unknown fields resolve to "". */
export function resolvePlaceholders(template: string, ctx: RunContext): string {
  let result = template.replace(FIELD_PLACEHOLDER, (_match, fieldId: string) => {
    const answer = ctx.rawAnswers.find((a) => a.fieldId === fieldId.trim());
    return answer ? formatAnswerValue(answer.value) : "";
  });

  result = result.replace(SPECIAL_PLACEHOLDER, (_match, token: string) => {
    switch (token) {
      case "form:title":
        return ctx.form.metadata.title;
      case "response:id":
        return ctx.response.id;
      case "response:submittedAt":
        return ctx.response.submittedAt;
      case "response:all":
        return formatAllAnswers(ctx);
      default:
        return "";
    }
  });

  return result;
}
