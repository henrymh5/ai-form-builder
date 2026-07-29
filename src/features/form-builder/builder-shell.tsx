"use client";

import { useEffect } from "react";
import type { FormDefinition } from "@/lib/form-schema/schema";
import type { FormVersionSummary } from "@/lib/db/repositories/form-versions";
import { useBuilderStore } from "@/features/form-builder/builder-store";
import { useAutosave } from "@/features/form-builder/use-autosave";
import { FieldPalette } from "@/features/form-builder/field-palette";
import { BuilderCanvas } from "@/features/form-builder/builder-canvas";
import { PropertiesPanel } from "@/features/form-builder/properties-panel";
import { BuilderToolbar } from "@/features/form-builder/builder-toolbar";
import { BuilderDndContext } from "@/features/form-builder/builder-dnd-context";

interface BuilderShellProps {
  formId: string;
  workspaceId: string;
  title: string;
  definition: FormDefinition;
  draftRevision: number;
  versions: FormVersionSummary[];
}

/** Loads the form's draft definition into the Builder Store and renders the 3-column layout (plan §5/§6/§14). */
export function BuilderShell({
  formId,
  workspaceId,
  title,
  definition,
  draftRevision,
  versions,
}: BuilderShellProps) {
  const loadDefinition = useBuilderStore((s) => s.loadDefinition);
  const storeDefinition = useBuilderStore((s) => s.definition);
  const { status, retry, revision, syncRevision } = useAutosave(formId, draftRevision);

  useEffect(() => {
    loadDefinition(definition);
    // Runs once per mount (per form id, since the page unmounts/remounts on navigation).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!storeDefinition) return null;

  return (
    <div className="-m-8 flex h-[calc(100vh-var(--layout-header-height))] flex-col">
      <BuilderToolbar
        formId={formId}
        title={title}
        status={status}
        onRetry={retry}
        revision={revision}
        versions={versions}
        onVersionRestored={syncRevision}
      />
      <BuilderDndContext>
        <div className="flex flex-1 overflow-hidden">
          <FieldPalette />
          <BuilderCanvas />
          <PropertiesPanel workspaceId={workspaceId} formId={formId} />
        </div>
      </BuilderDndContext>
    </div>
  );
}
