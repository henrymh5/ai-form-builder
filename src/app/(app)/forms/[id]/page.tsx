import { notFound } from "next/navigation";
import { getForm } from "@/lib/db/repositories/forms";
import { listFormVersions } from "@/lib/db/repositories/form-versions";
import { BuilderShell } from "@/features/form-builder/builder-shell";

/** Visual 3-column form builder (plan §5/§6/§14). */
export default async function FormBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await getForm(id);
  if (!form) notFound();

  const versions = await listFormVersions(id);

  return (
    <BuilderShell
      formId={form.id}
      workspaceId={form.workspaceId}
      title={form.title}
      definition={form.draftDefinition}
      draftRevision={form.draftRevision}
      versions={versions}
    />
  );
}
