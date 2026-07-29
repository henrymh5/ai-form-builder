import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Cookie-authenticated Supabase client for Server Components, Server
 * Actions, and Route Handlers acting on behalf of the logged-in user — RLS
 * is enforced (plan §2.3). This is the ONLY client authenticated code
 * should use; never the service-role client (see service-client.ts).
 */
export async function createUserClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component during render — the middleware
          // already refreshes the session cookie on every request, so this
          // is safe to ignore here (documented Supabase SSR pattern).
        }
      },
    },
  });
}
