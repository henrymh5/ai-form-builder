/**
 * Unified application error (plan §2.3). Repositories and route handlers
 * throw/return AppError; route handlers map it to the JSON error envelope
 * `{ error: { code, message } }`. `publicMessage` is safe to show to a
 * caller — never leak internal detail (e.g. raw Postgres/Zod errors) there.
 */

export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "UNAUTHENTICATED"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "PAYLOAD_TOO_LARGE"
  | "AI_INVALID_OUTPUT"
  | "AI_REFUSED"
  | "AI_TIMEOUT"
  | "AI_UPSTREAM"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  VALIDATION_ERROR: 422,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  UNAUTHENTICATED: 401,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  PAYLOAD_TOO_LARGE: 413,
  AI_INVALID_OUTPUT: 502,
  AI_REFUSED: 502,
  AI_TIMEOUT: 504,
  AI_UPSTREAM: 502,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly publicMessage: string;
  /** Extra machine-readable context (e.g. retryAfter seconds) for the client. */
  readonly details?: Record<string, unknown>;

  constructor(
    code: AppErrorCode,
    publicMessage: string,
    options?: { cause?: unknown; details?: Record<string, unknown> },
  ) {
    super(publicMessage, { cause: options?.cause });
    this.name = "AppError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.publicMessage = publicMessage;
    this.details = options?.details;
  }

  toResponseBody(): {
    error: { code: AppErrorCode; message: string; details?: Record<string, unknown> };
  } {
    return {
      error: {
        code: this.code,
        message: this.publicMessage,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
