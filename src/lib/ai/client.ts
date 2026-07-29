import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Server-only Anthropic client (plan §11 "Der Anthropic API-Key darf
 * ausschließlich serverseitig verwendet werden"). The `server-only` import
 * makes any accidental client-component import a build error. Never import
 * this outside `lib/ai` — route handlers/actions call the functions in
 * `lib/ai/functions`, not this client directly.
 */
let cachedClient: Anthropic | undefined;

export function getAnthropicClient(): Anthropic {
  cachedClient ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return cachedClient;
}

/** Model used for all form-generation AI functions (plan §11). */
export const AI_MODEL = "claude-haiku-4-5";
