import "server-only";
import { createServiceClient } from "@/lib/db/service-client";
import { AppError } from "@/lib/errors";

/**
 * Fixed-window rate limiter (plan §2.4/§11 "Rate Limit pro Nutzer, Rate
 * Limit pro Workspace, Tageslimit für Generierungen") backed by the
 * `increment_rate_limit` Postgres function (0009) — atomic increment avoids
 * a read-then-write race under concurrent requests. Windows are keyed by
 * `<scope>:<id>:<windowStartISO>` so different window sizes never collide.
 */
export interface RateLimitConfig {
  /** Unique key for this limiter, e.g. `ai:user`, `ai:workspace:daily`. */
  scope: string;
  windowMs: number;
  max: number;
}

export async function checkRateLimit(config: RateLimitConfig, identifier: string): Promise<void> {
  const windowStart = new Date(
    Math.floor(Date.now() / config.windowMs) * config.windowMs,
  ).toISOString();
  const key = `${config.scope}:${identifier}`;

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("increment_rate_limit", {
    p_key: key,
    p_window_start: windowStart,
  });

  if (error) {
    // Fail open on infra errors — a broken rate limiter must never block
    // all AI usage outright; the per-request/token limits still apply.
    return;
  }

  if ((data ?? 0) > config.max) {
    throw new AppError("RATE_LIMITED", "Zu viele Anfragen. Bitte versuche es später erneut.", {
      details: { retryAfterMs: config.windowMs },
    });
  }
}

/** AI-specific limiter presets (plan §11). */
export const AI_RATE_LIMITS = {
  perUserMinute: { scope: "ai:user:minute", windowMs: 60_000, max: 10 },
  perWorkspaceMinute: { scope: "ai:workspace:minute", windowMs: 60_000, max: 30 },
  perUserDaily: { scope: "ai:user:day", windowMs: 86_400_000, max: 100 },
} as const satisfies Record<string, RateLimitConfig>;

/**
 * The workflow "aiAction" node calls Claude without a human clicking a
 * button (it runs on every matching form submission), so it needs its own,
 * workspace-scoped cap independent of the Builder's AI-generation limits.
 */
export const WORKFLOW_AI_ACTION_RATE_LIMIT: RateLimitConfig = {
  scope: "workflow:ai:workspace:minute",
  windowMs: 60_000,
  max: 30,
};
