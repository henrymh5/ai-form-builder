import "server-only";
import { createUserClient } from "@/lib/db/user-client";

export interface CurrentUser {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
}

/** Returns the current user + profile, or `null` if not authenticated. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

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
}
