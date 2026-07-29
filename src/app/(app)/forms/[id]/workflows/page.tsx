import Link from "next/link";
import { notFound } from "next/navigation";
import { getForm } from "@/lib/db/repositories/forms";
import { listWorkflows } from "@/lib/db/repositories/workflows";
import { Card } from "@/components/ui/card";
import { CreateWorkflowDialog } from "@/features/workflow-builder/create-workflow-dialog";
import { WorkflowCard } from "@/features/workflow-builder/workflow-card";

interface WorkflowsPageProps {
  params: Promise<{ id: string }>;
}

/** Workflow list for a form: create manually or via AI, enable/pause, open the editor or run history. */
export default async function WorkflowsPage({ params }: WorkflowsPageProps) {
  const { id } = await params;
  const form = await getForm(id);
  if (!form) notFound();

  const workflows = await listWorkflows(id);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/forms/${id}`}
            className="text-text-secondary hover:text-text-primary text-sm"
          >
            ← {form.title}
          </Link>
          <h1 className="text-text-primary text-2xl font-semibold">Workflows</h1>
        </div>
        <CreateWorkflowDialog formId={id} />
      </div>

      {workflows.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-text-primary text-sm font-medium">Noch keine Workflows</p>
          <p className="text-text-secondary max-w-sm text-sm">
            Erstelle einen Workflow, um bei jeder neuen Antwort automatisch E-Mails zu versenden,
            Webhooks aufzurufen oder Antworten zu verarbeiten.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
            <WorkflowCard key={workflow.id} workflow={workflow} formId={id} />
          ))}
        </div>
      )}
    </div>
  );
}
