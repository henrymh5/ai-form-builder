import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Browser-side Supabase client for Client Components (e.g. auth forms that
 * call `signInWithPassword` directly). RLS is enforced the same as the
 * server user-client — this only ever carries the public anon key.
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
