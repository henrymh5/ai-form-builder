import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";

/**
 * Hard-coded local Supabase defaults (plan §16 Phase-3 DoD) — these are the
 * well-known, publicly documented demo keys the Supabase CLI prints for
 * every local stack, not a secret. Never point this at a non-local URL.
 */
const LOCAL_URL = "http://127.0.0.1:54321";
const LOCAL_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const LOCAL_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

export function serviceClient(): SupabaseClient<Database> {
  return createClient<Database>(LOCAL_URL, LOCAL_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function anonClient(): SupabaseClient<Database> {
  return createClient<Database>(LOCAL_URL, LOCAL_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let counter = 0;

/** Creates a confirmed test user and returns a client authenticated as them. */
export async function createTestUser(
  displayName: string,
): Promise<{ userId: string; email: string; client: SupabaseClient<Database> }> {
  counter += 1;
  const email = `rls-test-${Date.now()}-${counter}@example.com`;
  const password = "test-password-123!";

  const admin = serviceClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message}`);
  }

  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(`Failed to sign in test user: ${signInError.message}`);
  }

  return { userId: data.user.id, email, client };
}

export async function deleteTestUser(userId: string): Promise<void> {
  const admin = serviceClient();
  await admin.auth.admin.deleteUser(userId);
}
