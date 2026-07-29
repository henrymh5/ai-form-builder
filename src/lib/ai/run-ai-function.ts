import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { getAnthropicClient, AI_MODEL } from "@/lib/ai/client";
import { logAiUsage } from "@/lib/db/repositories/ai-usage-log";
import { AppError } from "@/lib/errors";

/**
 * Prompt-versioned AI function execution (plan §11 "Prompt-Versionierung":
 * every AI function has a name, a prompt version, an input schema, an
 * output schema, and a max token count). This is the one place that talks
 * to the Anthropic SDK — `functions/*.ts` each declare their own prompt and
 * schemas and call this to run it.
 */
export interface AiFunctionSpec<Output extends z.ZodType> {
  /** e.g. "generate-form", used as the `operation` in usage logging. */
  name: string;
  /** e.g. "v1" — combined with `name` gives "generate-form:v1" (plan §11). */
  promptVersion: string;
  outputSchema: Output;
  maxTokens: number;
  systemPrompt: string;
  userPrompt: string;
}

export interface AiFunctionContext {
  userId: string;
  workspaceId: string | null;
  formId: string | null;
}

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs one Claude call with structured output, retrying on rate limits and
 * transient server errors with exponential backoff (plan §11 "Retry mit
 * Exponential Backoff bei temporären Fehlern" — and respecting the API's
 * own `retry-after` guidance is handled by the SDK's built-in retry logic
 * for the same status codes; this adds a second, coarser retry layer at
 * the level of a single structured-output call).
 */
export async function runAiFunction<Output extends z.ZodType>(
  spec: AiFunctionSpec<Output>,
  context: AiFunctionContext,
): Promise<z.infer<Output>> {
  const client = getAnthropicClient();
  const startedAt = Date.now();
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.parse({
        model: AI_MODEL,
        max_tokens: spec.maxTokens,
        system: spec.systemPrompt,
        messages: [{ role: "user", content: spec.userPrompt }],
        output_config: { format: zodOutputFormat(spec.outputSchema) },
      });

      if (response.stop_reason === "refusal") {
        throw new AppError("AI_REFUSED", "Die KI konnte diese Anfrage nicht bearbeiten.");
      }

      // Structural validation already happened via `messages.parse` against
      // the JSON schema; `parsed_output` can still be null if parsing failed
      // (e.g. `max_tokens` truncation) — treat that as an invalid-output error.
      if (response.parsed_output === null) {
        throw new AppError("AI_INVALID_OUTPUT", "Die KI-Antwort konnte nicht verarbeitet werden.");
      }

      await logAiUsage({
        workspaceId: context.workspaceId,
        userId: context.userId,
        formId: context.formId,
        operation: spec.name,
        promptVersion: spec.promptVersion,
        model: AI_MODEL,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        latencyMs: Date.now() - startedAt,
        status: "success",
        errorCode: null,
      });

      return response.parsed_output;
    } catch (error) {
      lastError = error;

      const isRetryable =
        error instanceof Anthropic.RateLimitError ||
        error instanceof Anthropic.InternalServerError ||
        error instanceof Anthropic.APIConnectionError;

      if (!isRetryable || attempt === MAX_RETRIES) {
        await logAiUsage({
          workspaceId: context.workspaceId,
          userId: context.userId,
          formId: context.formId,
          operation: spec.name,
          promptVersion: spec.promptVersion,
          model: AI_MODEL,
          inputTokens: null,
          outputTokens: null,
          latencyMs: Date.now() - startedAt,
          status: "error",
          errorCode: isAppError(error) ? error.code : "unknown",
        });
        break;
      }

      await sleep(BASE_BACKOFF_MS * 2 ** attempt);
    }
  }

  if (isAppError(lastError)) throw lastError;
  if (lastError instanceof Anthropic.RateLimitError) {
    throw new AppError("AI_UPSTREAM", "Die KI ist derzeit überlastet. Bitte versuche es erneut.");
  }
  if (lastError instanceof Anthropic.APIError) {
    throw new AppError("AI_UPSTREAM", "Die KI-Anfrage ist fehlgeschlagen.", { cause: lastError });
  }
  throw new AppError("AI_TIMEOUT", "Die KI-Anfrage konnte nicht abgeschlossen werden.", {
    cause: lastError,
  });
}

function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
