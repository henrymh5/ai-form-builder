import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/repositories/profile";
import { listMyWorkspaces } from "@/lib/db/repositories/workspaces";
import { listForms } from "@/lib/db/repositories/forms";
import { listWorkflows } from "@/lib/db/repositories/workflows";
import { Card } from "@/components/ui/card";
import { CreateWorkflowDialog } from "@/features/workflow-builder/create-workflow-dialog";
import { WorkflowCard } from "@/features/workflow-builder/workflow-card";

/** Top-level workflow list — workspace-scoped, no longer nested under a form (mirrors src/app/(app)/forms/page.tsx). */
export default async function WorkflowsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const workspaces = await listMyWorkspaces();
  const workspace = workspaces[0];
  if (!workspace) {
    return <p className="text-text-secondary text-sm">Kein Workspace gefunden.</p>;
  }

  const [workflows, forms] = await Promise.all([
    listWorkflows(workspace.id),
    listForms(workspace.id),
  ]);
  const formTitleById = Object.fromEntries(forms.map((f) => [f.id, f.title]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-text-primary text-2xl font-semibold">Workflows</h1>
        <CreateWorkflowDialog
          workspaceId={workspace.id}
          forms={forms.map((f) => ({ id: f.id, title: f.title }))}
        />
      </div>

      {workflows.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-text-primary text-sm font-medium">Noch keine Workflows</p>
          <p className="text-text-secondary max-w-sm text-sm">
            Erstelle einen Workflow, um bei jeder neuen Antwort auf einem oder mehreren Formularen
            automatisch E-Mails zu versenden, Webhooks aufzurufen oder Antworten zu verarbeiten.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
            <WorkflowCard key={workflow.id} workflow={workflow} formTitleById={formTitleById} />
          ))}
        </div>
      )}
    </div>
  );
}
