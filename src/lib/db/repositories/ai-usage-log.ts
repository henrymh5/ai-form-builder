import "server-only";
import { createServiceClient } from "@/lib/db/service-client";

/**
 * Cost/usage logging (plan §11 "Kosten- und Nutzungskontrolle") — written
 * via the service-role client because `ai_generations` has no insert policy
 * for regular users (0009: "geschrieben ausschließlich vom serverseitigen
 * AI-Operation-Runner"). Never blocks the AI response on a logging failure.
 */
export interface UsageLogEntry {
  workspaceId: string | null;
  userId: string | null;
  formId: string | null;
  operation: string;
  promptVersion: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
  status: "success" | "error";
  errorCode: string | null;
}

export async function logAiUsage(entry: UsageLogEntry): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("ai_generations").insert({
      workspace_id: entry.workspaceId,
      user_id: entry.userId,
      form_id: entry.formId,
      operation: entry.operation,
      prompt_version: entry.promptVersion,
      model: entry.model,
      input_tokens: entry.inputTokens,
      output_tokens: entry.outputTokens,
      latency_ms: entry.latencyMs,
      status: entry.status,
      error_code: entry.errorCode,
    });
  } catch {
    // Usage logging is observability, not a correctness requirement —
    // never let a logging failure surface as an AI-request failure.
  }
}
