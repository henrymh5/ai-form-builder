"use client";

import Link from "next/link";
import { ArrowLeft, Redo2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBuilderStore } from "@/features/form-builder/builder-store";
import { ConditionsPanel } from "@/features/form-builder/conditions-panel";
import { FormSettingsDialog } from "@/features/form-builder/form-settings-dialog";
import { ThemeEditorDialog } from "@/features/form-themes/theme-editor-dialog";
import { PreviewDialog } from "@/features/form-builder/preview-dialog";
import { PublishButton } from "@/features/form-builder/publish-button";
import { VersionHistoryDialog } from "@/features/form-builder/version-history-dialog";
import type { AutosaveStatus } from "@/features/form-builder/use-autosave";
import type { FormVersionSummary } from "@/lib/db/repositories/form-versions";

const STATUS_LABEL: Record<AutosaveStatus, string> = {
  idle: "",
  saving: "Speichert …",
  saved: "Gespeichert",
  error: "Fehler beim Speichern",
};

/** Builder header: back link, form title, undo/redo, autosave status (plan §6/§14). */
export function BuilderToolbar({
  formId,
  title,
  status,
  onRetry,
  revision,
  versions,
  onVersionRestored,
}: {
  formId: string;
  title: string;
  status: AutosaveStatus;
  onRetry: () => void;
  revision: number;
  versions: FormVersionSummary[];
  onVersionRestored: (newRevision: number) => void;
}) {
  const undo = useBuilderStore((s) => s.undo);
  const redo = useBuilderStore((s) => s.redo);
  const past = useBuilderStore((s) => s.past);
  const future = useBuilderStore((s) => s.future);

  return (
    <div className="border-border bg-surface flex min-h-14 w-full shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/dashboard"
          className="text-text-secondary hover:text-text-primary flex shrink-0 items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" />
          Zurück
        </Link>
        <span className="text-border">|</span>
        <span className="text-text-primary truncate text-sm font-medium">{title}</span>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
        <Link
          href={`/forms/${formId}/responses`}
          className="text-text-secondary hover:text-text-primary text-sm"
        >
          Antworten
        </Link>
        <Link
          href={`/forms/${formId}/analytics`}
          className="text-text-secondary hover:text-text-primary text-sm"
        >
          Analytics
        </Link>
        <PreviewDialog />
        <ThemeEditorDialog />
        <ConditionsPanel />
        <FormSettingsDialog />
        <VersionHistoryDialog
          formId={formId}
          versions={versions}
          currentDraftRevision={revision}
          onRestored={onVersionRestored}
        />

        {status === "error" ? (
          <button
            type="button"
            onClick={onRetry}
            className="text-error text-sm font-medium hover:underline"
          >
            {STATUS_LABEL.error} · Erneut versuchen
          </button>
        ) : (
          <span className="text-text-muted text-sm" data-autosave-status={status}>
            {STATUS_LABEL[status]}
          </span>
        )}

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Rückgängig"
            disabled={past.length === 0}
            onClick={() => undo()}
          >
            <Undo2 className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Wiederholen"
            disabled={future.length === 0}
            onClick={() => redo()}
          >
            <Redo2 className="size-4" />
          </Button>
        </div>

        <PublishButton formId={formId} draftRevision={revision} autosaveStatus={status} />
      </div>
    </div>
  );
}
