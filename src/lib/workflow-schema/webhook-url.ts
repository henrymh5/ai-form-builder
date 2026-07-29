/**
 * Pragmatic SSRF guard for workflow webhook URLs — used both at schema
 * validation time (Builder warnings) and again at execution time (workflow
 * engine, since the URL is only re-checked, never re-resolved via DNS).
 *
 * This is a heuristic hostname blacklist, not a full SSRF defense (no
 * DNS-rebinding protection). Documented as a v1 risk in the workflow plan.
 */

const BLOCKED_HOSTNAME_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^\[::1\]$/,
  /^::1$/,
];

export interface WebhookUrlCheck {
  ok: boolean;
  reason?: string;
}

export function checkWebhookUrl(rawUrl: string): WebhookUrlCheck {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "Ungültige URL." };
  }

  const allowedProtocols =
    process.env.NODE_ENV === "production" ? ["https:"] : ["https:", "http:"];
  if (!allowedProtocols.includes(url.protocol)) {
    return { ok: false, reason: "Webhook-URLs müssen https verwenden." };
  }

  const hostname = url.hostname;
  if (BLOCKED_HOSTNAME_PATTERNS.some((pattern) => pattern.test(hostname))) {
    return { ok: false, reason: "Diese Adresse ist als Webhook-Ziel nicht erlaubt." };
  }

  return { ok: true };
}
