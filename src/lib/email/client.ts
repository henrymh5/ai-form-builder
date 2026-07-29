import "server-only";
import { Resend } from "resend";
import { AppError } from "@/lib/errors";

/**
 * Server-only Resend client — mirrors lib/ai/client.ts. Never import this
 * outside lib/email; workflow-engine/actions/email.ts calls the function in
 * this module, not the SDK directly.
 */
let cachedClient: Resend | undefined;

export function getResendClient(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new AppError(
      "CONFIG_ERROR",
      "E-Mail-Versand ist nicht konfiguriert (RESEND_API_KEY fehlt).",
    );
  }
  cachedClient ??= new Resend(process.env.RESEND_API_KEY);
  return cachedClient;
}

export function getResendFromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new AppError(
      "CONFIG_ERROR",
      "E-Mail-Versand ist nicht konfiguriert (RESEND_FROM_EMAIL fehlt).",
    );
  }
  return from;
}
