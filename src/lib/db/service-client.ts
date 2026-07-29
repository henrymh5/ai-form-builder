import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseServiceRoleKey, supabaseUrl } from "./env";

/**
 * Service-role Supabase client — bypasses RLS entirely (plan §7.2/§14).
 *
 * Restricted to lib/db by an ESLint `no-restricted-imports` rule
 * (eslint.config.mjs) — nothing outside this directory may import it
 * directly. Only used for the anonymous public form pathways (sessions,
 * events, submissions) AFTER explicit server-side validation, and for
 * server-side jobs (retention purges). Never construct this client
 * per-request from user input; it must only ever be called from trusted
 * server code paths.
 */
let cachedClient: ReturnType<typeof createClient<Database>> | undefined;

export function createServiceClient() {
  cachedClient ??= createClient<Database>(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}
