import "server-only";
import { createServiceClient } from "@/lib/db/service-client";

/**
 * Resolves a user's ID by email — an admin-only operation, hence the
 * service-role client (plan §7.2). The actual membership insert this
 * supports still goes through the regular user client and its
 * owner-only RLS policy (see workspaces.ts `addWorkspaceMember`), so this
 * function only ever answers "does this email have an account and what's
 * its ID" — it never grants access by itself.
 *
 * [A2]: paginated `listUsers` scan — the Admin API has no direct
 * getUserByEmail. Fine at portfolio scale; would need a dedicated lookup
 * (e.g. a SECURITY DEFINER RPC over auth.users) if the user base grows large
 * enough for this to matter.
 */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const supabase = createServiceClient();
  const normalized = email.trim().toLowerCase();

  let page = 1;
  const perPage = 200;
  for (let i = 0; i < 25; i++) {
    // Guard: at most 5000 users scanned (25 * 200) — see doc comment above.
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error || !data) return null;

    const match = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (match) return match.id;

    if (data.users.length < perPage) return null; // last page
    page += 1;
  }
  return null;
}
