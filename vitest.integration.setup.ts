import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Loads `.env.local` into `process.env` for integration tests — plain vitest
 * has no equivalent of Next.js's automatic env-file loading, but
 * `lib/db/env.ts` (used by production code under test here, e.g. run.ts)
 * reads `process.env` directly. Only sets variables not already present, so
 * CI can still inject its own values.
 */
function loadEnvLocal(): void {
  let contents: string;
  try {
    contents = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
  } catch {
    return; // no .env.local — fine in CI, where env vars are injected directly
  }

  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();
