import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { CreateFormDialog } from "@/features/form-builder/create-form-dialog";
import { FormCard } from "@/features/form-builder/form-card";
import { FormsToolbar } from "@/features/form-builder/forms-toolbar";
import { EmailConfirmedToast } from "@/features/workspaces/email-confirmed-toast";
import { getCurrentUser } from "@/lib/db/repositories/profile";
import { listForms, type FormStatus } from "@/lib/db/repositories/forms";
import { listMyWorkspaces } from "@/lib/db/repositories/workspaces";

const VALID_STATUSES: FormStatus[] = ["draft", "published", "paused", "archived"];
const VALID_SORTS = ["updated_desc", "created_desc", "responses_desc"] as const;

interface DashboardPageProps {
  searchParams: Promise<{ status?: string; search?: string; sort?: string; confirmed?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const workspaces = await listMyWorkspaces();
  const workspace = workspaces[0];
  if (!workspace) {
    return <p className="text-text-secondary text-sm">Kein Workspace gefunden.</p>;
  }

  const status = VALID_STATUSES.find((s) => s === params.status);
  const sort = VALID_SORTS.find((s) => s === params.sort);

  const forms = await listForms(workspace.id, {
    status,
    search: params.search?.trim() || undefined,
    sort,
  });

  return (
    <div className="space-y-6">
      <EmailConfirmedToast />
      <div className="flex items-center justify-between">
        <h1 className="text-text-primary text-2xl font-semibold">Formulare</h1>
        <CreateFormDialog workspaceId={workspace.id} />
      </div>

      <FormsToolbar />

      {forms.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-text-primary text-sm font-medium">
            {params.search || params.status ? "Keine Formulare gefunden" : "Noch keine Formulare"}
          </p>
          <p className="text-text-secondary max-w-sm text-sm">
            {params.search || params.status
              ? "Passe die Suche oder den Filter an."
              : "Erstelle dein erstes Formular per KI-Beschreibung, aus einer Vorlage oder ganz von Grund auf."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <FormCard key={form.id} form={form} />
          ))}
        </div>
      )}
    </div>
  );
}
