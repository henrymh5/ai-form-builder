import { redirect } from "next/navigation";
import { CreateFormDialog } from "@/features/form-builder/create-form-dialog";
import { DashboardGrid } from "@/features/workspaces/dashboard/dashboard-grid";
import { EmailConfirmedToast } from "@/features/workspaces/email-confirmed-toast";
import { getCurrentUser } from "@/lib/db/repositories/profile";
import { getWorkspaceOverview } from "@/lib/db/repositories/workspace-overview";
import { listMyWorkspaces } from "@/lib/db/repositories/workspaces";

/** Workspace landing page: statistics and quick entry points. The form list lives at `/forms`. */
export default async function DashboardPage() {
  // Both are cache()-wrapped and already resolved by the (app) layout above
  // this page — the real serialization was inside getWorkspaceOverview
  // (now parallelized there instead).
  const [user, workspaces] = await Promise.all([getCurrentUser(), listMyWorkspaces()]);
  if (!user) redirect("/login");

  const workspace = workspaces[0];
  if (!workspace) {
    return <p className="text-text-secondary text-sm">Kein Workspace gefunden.</p>;
  }

  const overview = await getWorkspaceOverview(workspace.id);

  return (
    <div className="space-y-6">
      <EmailConfirmedToast />
      <div className="flex items-center justify-between">
        <h1 className="text-text-primary text-2xl font-semibold">Dashboard</h1>
        <CreateFormDialog workspaceId={workspace.id} />
      </div>

      <DashboardGrid overview={overview} />
    </div>
  );
}
