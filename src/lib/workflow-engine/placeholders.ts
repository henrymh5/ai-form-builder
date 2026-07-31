import type { DigestResponse, RunContext } from "./context";

/**
 * Placeholder resolution for email subjects/bodies, note text, and webhook
 * payloads. IDs (not labels) are used for `{{field:…}}` because labels are
 * not stable/unique — the editor's field picker inserts the ID syntax so
 * users never type it by hand.
 *
 * `{{field:…}}`/`{{response:…}}` only resolve for response_submitted runs
 * and degrade to "" otherwise (validate.ts warns about this at save time —
 * a warning, not an error, matching the "hard-fail configs are errors,
 * silently-empty output is a warning" rule). `{{digest:…}}` is the mirror
 * for every other trigger type; `{{payload:json}}` for webhook_inbound;
 * `{{ai:result}}` works under any trigger once an aiAction node has run.
 */

const FIELD_PLACEHOLDER = /\{\{field:([^}]+)\}\}/g;
const SPECIAL_PLACEHOLDER =
  /\{\{(form:title|response:id|response:submittedAt|response:all|digest:count|digest:list|payload:json|ai:result)\}\}/g;

const DIGEST_LIST_MAX_RESPONSES = 50;
const DIGEST_LIST_MAX_CHARS = 20_000;
const PAYLOAD_JSON_MAX_CHARS = 4_000;

function formatAnswerValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Ja" : "Nein";
  return String(value);
}

function fieldLabel(ctx: RunContext, fieldId: string): string {
  const field = ctx.form?.pages.flatMap((p) => p.fields).find((f) => f.id === fieldId);
  return field && "label" in field ? field.label : fieldId;
}

function formatAllAnswers(ctx: RunContext): string {
  return ctx.rawAnswers
    .map((a) => `${fieldLabel(ctx, a.fieldId)}: ${formatAnswerValue(a.value)}`)
    .join("\n");
}

function formatDigestResponse(response: DigestResponse): string {
  const lines = response.answers.map((a) => `  ${a.fieldId}: ${formatAnswerValue(a.value)}`);
  return `**${response.formTitle}** – ${response.submittedAt}\n${lines.join("\n")}`;
}

function formatDigestList(ctx: RunContext): string {
  if (!ctx.digest) return "";
  const shown = ctx.digest.responses.slice(0, DIGEST_LIST_MAX_RESPONSES);
  const remaining = ctx.digest.responses.length - shown.length;

  let text = shown.map(formatDigestResponse).join("\n\n");
  if (text.length > DIGEST_LIST_MAX_CHARS) {
    text = text.slice(0, DIGEST_LIST_MAX_CHARS) + "…";
  }
  if (remaining > 0) {
    text += `\n\n… und ${remaining} weitere.`;
  }
  return text;
}

function formatPayloadJson(ctx: RunContext): string {
  if (ctx.webhookPayload === null || ctx.webhookPayload === undefined) return "";
  let text: string;
  try {
    text = JSON.stringify(ctx.webhookPayload, null, 2);
  } catch {
    return "";
  }
  return text.length > PAYLOAD_JSON_MAX_CHARS ? text.slice(0, PAYLOAD_JSON_MAX_CHARS) + "…" : text;
}

/** Resolves all placeholders in `template` against the run context. Unresolvable tokens (wrong trigger type, unknown field) resolve to "". */
export function resolvePlaceholders(template: string, ctx: RunContext): string {
  let result = template.replace(FIELD_PLACEHOLDER, (_match, fieldId: string) => {
    const answer = ctx.rawAnswers.find((a) => a.fieldId === fieldId.trim());
    return answer ? formatAnswerValue(answer.value) : "";
  });

  result = result.replace(SPECIAL_PLACEHOLDER, (_match, token: string) => {
    switch (token) {
      case "form:title":
        return ctx.form?.metadata.title ?? "";
      case "response:id":
        return ctx.response?.id ?? "";
      case "response:submittedAt":
        return ctx.response?.submittedAt ?? "";
      case "response:all":
        return ctx.response ? formatAllAnswers(ctx) : "";
      case "digest:count":
        return ctx.digest ? String(ctx.digest.responses.length) : "";
      case "digest:list":
        return formatDigestList(ctx);
      case "payload:json":
        return formatPayloadJson(ctx);
      case "ai:result":
        return ctx.aiResult ?? "";
      default:
        return "";
    }
  });

  return result;
}
