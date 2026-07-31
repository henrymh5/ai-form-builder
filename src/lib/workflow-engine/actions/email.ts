import { getResendClient, getResendFromAddress } from "@/lib/email/client";
import type { emailNodeSchema } from "@/lib/workflow-schema/nodes";
import type { z } from "zod";
import type { ActionHandler, RunContext } from "../context";
import { resolvePlaceholders } from "../placeholders";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailNodeConfig = z.infer<typeof emailNodeSchema>["config"];

function resolveRecipient(config: EmailNodeConfig, ctx: RunContext): string {
  if (config.to === "creator") {
    if (!ctx.creatorEmail) throw new Error("E-Mail-Adresse des Workflow-Erstellers ist unbekannt.");
    return ctx.creatorEmail;
  }

  if (config.to === "custom") {
    if (!config.customTo) throw new Error("Keine feste Empfängeradresse konfiguriert.");
    return config.customTo;
  }

  if (!config.submitterFieldId) throw new Error("Kein Empfängerfeld konfiguriert.");
  if (!ctx.responseId) {
    throw new Error("Empfängerfeld ist nur bei einer einzelnen Antwort verfügbar.");
  }
  const answer = ctx.rawAnswers.find((a) => a.fieldId === config.submitterFieldId);
  const value = typeof answer?.value === "string" ? answer.value : "";
  if (!EMAIL_PATTERN.test(value)) {
    throw new Error("Die Antwort im Empfängerfeld ist keine gültige E-Mail-Adresse.");
  }
  return value;
}

/** "email" node — sends a notification via Resend, with placeholder resolution in subject/body. */
export const runEmailAction: ActionHandler = async (node, ctx) => {
  if (node.type !== "email") throw new Error("Falscher Knotentyp für email.");
  const { config } = node;

  const recipient = resolveRecipient(config, ctx);
  const subject = resolvePlaceholders(config.subject, ctx);
  const body = resolvePlaceholders(config.body, ctx);

  if (ctx.dryRun) {
    return { output: { simulated: true, to: recipient, subject } };
  }

  const resend = getResendClient();
  const { data, error } = await resend.emails.send({
    from: getResendFromAddress(),
    to: recipient,
    subject,
    text: body,
  });

  if (error) {
    throw new Error(`E-Mail-Versand fehlgeschlagen: ${error.message}`);
  }

  return { output: { messageId: data?.id, to: recipient } };
};
