import "server-only";
import { cache } from "react";
import { AppError } from "@/lib/errors";
import { getAuthUser } from "@/lib/db/auth-user";
import { createUserClient } from "@/lib/db/user-client";

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "editor" | "viewer";
}

/**
 * Workspaces the current user is a member of, with their role in each.
 *
 * Request-scoped via `cache()` for the same reason as {@link getCurrentUser}: the app
 * layout's topbar and every page below it need this list.
 */
export const listMyWorkspaces = cache(async (): Promise<WorkspaceSummary[]> => {
  const user = await getAuthUser();
  if (!user) {
    throw new AppError("UNAUTHENTICATED", "Nicht angemeldet.");
  }

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name, slug)")
    .eq("user_id", user.id);

  if (error) {
    throw new AppError("INTERNAL_ERROR", "Workspaces konnten nicht geladen werden.", {
      cause: error,
    });
  }

  return (data ?? [])
    .filter(
      (row): row is typeof row & { workspaces: NonNullable<(typeof row)["workspaces"]> } =>
        row.workspaces !== null,
    )
    .map((row) => ({
      id: row.workspaces.id,
      name: row.workspaces.name,
      slug: row.workspaces.slug,
      role: row.role,
    }));
});

export interface WorkspaceMember {
  userId: string;
  role: "owner" | "editor" | "viewer";
  displayName: string;
  avatarUrl: string | null;
}

/** Members of a workspace with profile info — relies on RLS to scope access. */
export async function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const supabase = await createUserClient();
  const { data: memberRows, error } = await supabase
    .from("workspace_members")
    .select("user_id, role")
    .eq("workspace_id", workspaceId);

  if (error) {
    throw new AppError("INTERNAL_ERROR", "Mitglieder konnten nicht geladen werden.", {
      cause: error,
    });
  }
  if (!memberRows || memberRows.length === 0) return [];

  // No direct FK from workspace_members to profiles (both reference
  // auth.users independently), so PostgREST can't embed the join — fetch
  // profiles separately instead.
  const { data: profileRows, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in(
      "id",
      memberRows.map((m) => m.user_id),
    );

  if (profilesError) {
    throw new AppError("INTERNAL_ERROR", "Mitglieder konnten nicht geladen werden.", {
      cause: profilesError,
    });
  }

  const profilesById = new Map((profileRows ?? []).map((p) => [p.id, p]));

  return memberRows
    .map((member) => {
      const profile = profilesById.get(member.user_id);
      if (!profile) return null;
      return {
        userId: member.user_id,
        role: member.role,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
      };
    })
    .filter((m): m is WorkspaceMember => m !== null);
}

/**
 * Adds an existing user (looked up by email via a profile join is not
 * possible client-side for privacy — this expects the caller to already
 * have resolved a user_id, e.g. via a server-side admin lookup) as a member.
 * [A2]: full email-invite flow (sending mail to non-existing accounts) is P2.
 */
export async function addWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: "editor" | "viewer",
): Promise<void> {
  const supabase = await createUserClient();
  const { error } = await supabase
    .from("workspace_members")
    .insert({ workspace_id: workspaceId, user_id: userId, role });

  if (error) {
    if (error.code === "23505") {
      throw new AppError("CONFLICT", "Diese Person ist bereits Mitglied des Workspace.");
    }
    throw new AppError("FORBIDDEN", "Mitglied konnte nicht hinzugefügt werden.", { cause: error });
  }
}

export async function updateWorkspaceMemberRole(
  workspaceId: string,
  userId: string,
  role: "owner" | "editor" | "viewer",
): Promise<void> {
  const supabase = await createUserClient();
  const { error } = await supabase
    .from("workspace_members")
    .update({ role })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  if (error) {
    throw new AppError("FORBIDDEN", "Rolle konnte nicht geändert werden.", { cause: error });
  }
}

export async function removeWorkspaceMember(workspaceId: string, userId: string): Promise<void> {
  const supabase = await createUserClient();
  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  if (error) {
    throw new AppError("FORBIDDEN", "Mitglied konnte nicht entfernt werden.", { cause: error });
  }
}
