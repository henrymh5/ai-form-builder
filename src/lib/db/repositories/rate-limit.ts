import "server-only";
import { createServiceClient } from "@/lib/db/service-client";
import { AppError } from "@/lib/errors";
import {
  windowRemainingMs,
  windowStartFor,
  type RateLimitWindow,
} from "@/lib/security/rate-limit-window";

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
  /**
   * Fixed window length. Use `"calendar-month"` for quotas that must reset on the 1st:
   * a month is not a constant number of milliseconds, so a fixed `windowMs` would drift
   * away from month boundaries over time.
   */
  windowMs: RateLimitWindow;
  max: number;
  /** Overrides the generic message when hitting this limit needs a specific explanation. */
  message?: string;
}

const DEFAULT_RATE_LIMIT_MESSAGE = "Zu viele Anfragen. Bitte versuche es später erneut.";

export async function checkRateLimit(config: RateLimitConfig, identifier: string): Promise<void> {
  const now = new Date();
  const windowStart = windowStartFor(config.windowMs, now);
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
    throw new AppError("RATE_LIMITED", config.message ?? DEFAULT_RATE_LIMIT_MESSAGE, {
      details: { retryAfterMs: windowRemainingMs(config.windowMs, now) },
    });
  }
}

/**
 * Gives back one unit of a consumed limit.
 *
 * Quotas are consumed up-front (before the expensive call) so concurrent requests can't
 * both slip past the check. When the attempt then fails for reasons outside the user's
 * control, that reservation has to be released again — otherwise a Claude outage would
 * silently eat someone's monthly allowance.
 *
 * Never lets a counter go below zero, and stays silent on infra errors: a failed refund
 * must not turn into a second error on top of the one being handled.
 */
export async function refundRateLimit(config: RateLimitConfig, identifier: string): Promise<void> {
  const windowStart = windowStartFor(config.windowMs, new Date());
  const supabase = createServiceClient();
  await supabase.rpc("decrement_rate_limit", {
    p_key: `${config.scope}:${identifier}`,
    p_window_start: windowStart,
  });
}

/** AI-specific limiter presets (plan §11). */
export const AI_RATE_LIMITS = {
  perUserMinute: { scope: "ai:user:minute", windowMs: 60_000, max: 10 },
  perWorkspaceMinute: { scope: "ai:workspace:minute", windowMs: 60_000, max: 30 },
  perUserDaily: { scope: "ai:user:day", windowMs: 86_400_000, max: 100 },
  /**
   * Hard monthly quota on AI form generation. Unlike the burst limits above this is a
   * usage cap, so it resets on the 1st rather than on a rolling window.
   */
  formGenerationPerUserMonth: {
    scope: "ai:generate-form:user:month",
    windowMs: "calendar-month",
    max: 5,
    message:
      "Du hast dein Monatslimit von 5 KI-Formularen erreicht. Am 1. des nächsten Monats stehen dir wieder 5 zur Verfügung.",
  },
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
