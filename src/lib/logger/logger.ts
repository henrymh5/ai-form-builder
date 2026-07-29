/**
 * Minimal structured logger — JSON on stdout, picked up by Vercel Logs.
 * No external logging service in V1 (plan §2.3); `captureError` is the single
 * seam a future Sentry adapter would replace.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogFields {
  requestId?: string;
  [key: string]: unknown;
}

function write(level: LogLevel, message: string, fields?: LogFields): void {
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...fields,
  };
  const line = JSON.stringify(entry);

  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, fields?: LogFields) => write("debug", message, fields),
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, fields?: LogFields) => write("error", message, fields),
};

/**
 * Single seam for error reporting. Logs structurally today; swapping in
 * Sentry (P2, plan §2.3) means changing only this function.
 */
export function captureError(error: unknown, fields?: LogFields): void {
  const normalized = error instanceof Error ? error : new Error(String(error));
  logger.error(normalized.message, {
    ...fields,
    stack: normalized.stack,
  });
}
