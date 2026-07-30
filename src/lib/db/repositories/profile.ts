import "server-only";
import { cache } from "react";
import { getAuthUser } from "@/lib/db/auth-user";
import { createUserClient } from "@/lib/db/user-client";

export interface CurrentUser {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
}

/**
 * Returns the current user + profile, or `null` if not authenticated.
 *
 * Request-scoped via `cache()`: the app layout and the page beneath it both need the user,
 * and without this each call meant a fresh auth round-trip plus a `profiles` query.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createUserClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? null,
    displayName: profile?.display_name ?? user.email ?? "Nutzer",
    avatarUrl: profile?.avatar_url ?? null,
  };
});
