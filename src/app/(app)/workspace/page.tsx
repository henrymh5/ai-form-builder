import { getCurrentUser } from "@/lib/db/repositories/profile";
import { listMyWorkspaces, listWorkspaceMembers } from "@/lib/db/repositories/workspaces";
import { redirect } from "next/navigation";
import { WorkspaceMembersPanel } from "@/features/workspaces/workspace-members-panel";

export default async function WorkspacePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const workspaces = await listMyWorkspaces();
  const workspace = workspaces[0];

  if (!workspace) {
    return <p className="text-text-secondary text-sm">Kein Workspace gefunden.</p>;
  }

  const members = await listWorkspaceMembers(workspace.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-text-primary text-2xl font-semibold">{workspace.name}</h1>
        <p className="text-text-secondary mt-1 text-sm">Mitglieder und Einstellungen verwalten.</p>
      </div>

      <WorkspaceMembersPanel
        workspaceId={workspace.id}
        currentUserId={user.id}
        currentUserRole={workspace.role}
        members={members}
      />
    </div>
  );
}
