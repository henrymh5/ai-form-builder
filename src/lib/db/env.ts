function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Fehlende Umgebungsvariable: ${name}`);
  }
  return value;
}

export function supabaseUrl(): string {
  return requireEnv("NEXT_PUBLIC_SUPABASE_URL");
}

export function supabaseAnonKey(): string {
  return requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

/** Service role key — never imported outside lib/db/service-client.ts (plan §7.2/§14). */
export function supabaseServiceRoleKey(): string {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}
