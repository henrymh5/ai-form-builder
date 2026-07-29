import { createHmac } from "node:crypto";
import { checkWebhookUrl } from "@/lib/workflow-schema/webhook-url";
import type { ActionHandler } from "../context";

const WEBHOOK_TIMEOUT_MS = 10_000;
const MAX_BODY_EXCERPT_LENGTH = 2000;

export interface WebhookPayload {
  event: "response.submitted";
  formId: string;
  responseId: string;
  submittedAt: string;
  answers?: { fieldId: string; fieldType: string; value: unknown }[];
}

/** HMAC-SHA256 over the raw JSON body, hex-encoded — verifiable by the receiver against the workflow's webhook secret. */
export function signWebhookPayload(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

/** "webhook" node — POSTs the response payload to a configured URL with an HMAC signature. */
export const runWebhookAction: ActionHandler = async (node, ctx) => {
  if (node.type !== "webhook") throw new Error("Falscher Knotentyp für webhook.");
  const { config } = node;

  const urlCheck = checkWebhookUrl(config.url);
  if (!urlCheck.ok) {
    throw new Error(urlCheck.reason ?? "Webhook-URL ist nicht erlaubt.");
  }

  const payload: WebhookPayload = {
    event: "response.submitted",
    formId: ctx.formId,
    responseId: ctx.responseId,
    submittedAt: ctx.response.submittedAt,
    ...(config.includeAnswers ? { answers: ctx.rawAnswers } : {}),
  };
  const rawBody = JSON.stringify(payload);

  if (ctx.dryRun) {
    return { output: { simulated: true, url: config.url, bodyExcerpt: rawBody.slice(0, MAX_BODY_EXCERPT_LENGTH) } };
  }

  const timestamp = Date.now().toString();
  const secret = ctx.workflow.webhookSecret;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-formcraft-timestamp": timestamp,
  };
  if (secret) {
    headers["x-formcraft-signature"] = `sha256=${signWebhookPayload(`${timestamp}.${rawBody}`, secret)}`;
  }

  const response = await fetch(config.url, {
    method: "POST",
    headers,
    body: rawBody,
    redirect: "error",
    signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
  });

  const responseText = await response.text().catch(() => "");
  const bodyExcerpt = responseText.slice(0, MAX_BODY_EXCERPT_LENGTH);

  if (response.status >= 400) {
    throw new Error(`Webhook antwortete mit Status ${response.status}.`);
  }

  return { output: { status: response.status, bodyExcerpt } };
};
