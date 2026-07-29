"use client";

import { useState } from "react";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBuilderStore } from "@/features/form-builder/builder-store";
import {
  getFormVersionDefinitionAction,
  restoreFormVersionAction,
} from "@/features/form-builder/actions/form-actions";
import { diffFormDefinitions, isDiffEmpty, type FormDiff } from "@/lib/form-schema/diff";
import type { FormVersionSummary } from "@/lib/db/repositories/form-versions";
import { cn } from "@/lib/cn";

const FIELD_CHANGE_LABEL: Record<string, string> = {
  added: "Hinzugefügt",
  removed: "Entfernt",
  label_changed: "Frage geändert",
  required_changed: "Pflichtfeld geändert",
  type_changed: "Feldtyp geändert",
};

interface VersionHistoryDialogProps {
  formId: string;
  versions: FormVersionSummary[];
  currentDraftRevision: number;
  onRestored: (newRevision: number) => void;
}

/**
 * Version history (plan §14): view older versions, see a diff against the
 * current draft, and restore one. Restoring loads the result straight into
 * the Builder Store so it rides the same undo/redo + autosave pipeline as
 * any other edit — it is not itself a new published version until the user
 * publishes again (plan §14 "Neue Änderungen finden anschließend wieder am
 * Entwurf statt").
 */
export function VersionHistoryDialog({
  formId,
  versions,
  currentDraftRevision,
  onRestored,
}: VersionHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [diff, setDiff] = useState<FormDiff | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadDefinition = useBuilderStore((s) => s.loadDefinition);
  const currentDefinition = useBuilderStore((s) => s.definition);

  async function selectVersion(versionId: string) {
    setSelectedVersionId(versionId);
    setDiff(null);
    setError(null);
    setIsLoading(true);
    try {
      const definition = await getFormVersionDefinitionAction(versionId);
      if (definition && currentDefinition) {
        setDiff(diffFormDefinitions(definition, currentDefinition));
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function restore() {
    if (!selectedVersionId) return;
    setIsRestoring(true);
    setError(null);
    try {
      const result = await restoreFormVersionAction(
        formId,
        selectedVersionId,
        currentDraftRevision,
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      const definition = await getFormVersionDefinitionAction(selectedVersionId);
      if (definition) loadDefinition(definition);
      if (result.newRevision !== undefined) onRestored(result.newRevision);
      setOpen(false);
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setSelectedVersionId(null);
          setDiff(null);
          setError(null);
        }
      }}
    >
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <History className="size-4" />
        Versionen
      </Button>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Versionshistorie</DialogTitle>
        </DialogHeader>

        {versions.length === 0 ? (
          <p className="text-text-secondary text-sm">
            Dieses Formular wurde noch nicht veröffentlicht.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="max-h-96 space-y-1 overflow-y-auto">
              {versions.map((version) => (
                <button
                  key={version.id}
                  type="button"
                  onClick={() => void selectVersion(version.id)}
                  className={cn(
                    "w-full rounded-md border p-2.5 text-left text-sm",
                    selectedVersionId === version.id
                      ? "border-primary bg-primary-subtle/30"
                      : "border-border hover:bg-surface-subtle",
                  )}
                >
                  <div className="text-text-primary font-medium">
                    Version {version.versionNumber}
                  </div>
                  <div className="text-text-muted text-xs">
                    {new Date(version.createdAt).toLocaleString("de-DE")}
                  </div>
                </button>
              ))}
            </div>

            <div className="max-h-96 space-y-3 overflow-y-auto">
              {isLoading ? (
                <p className="text-text-secondary text-sm">Lädt…</p>
              ) : !selectedVersionId ? (
                <p className="text-text-secondary text-sm">
                  Wähle eine Version, um Unterschiede zum aktuellen Entwurf zu sehen.
                </p>
              ) : diff && isDiffEmpty(diff) ? (
                <p className="text-text-secondary text-sm">
                  Keine Unterschiede zum aktuellen Entwurf.
                </p>
              ) : diff ? (
                <div className="space-y-1.5 text-sm">
                  {diff.titleChanged ? <p>Formulartitel geändert</p> : null}
                  {diff.pageChanges.map((change, i) => (
                    <p key={`page-${i}`}>
                      Seite &quot;{change.title}&quot;:{" "}
                      {change.kind === "added" ? "im Entwurf hinzugefügt" : "im Entwurf entfernt"}
                    </p>
                  ))}
                  {diff.fieldChanges.map((change, i) => (
                    <p key={`field-${i}`}>
                      &quot;{change.label}&quot;: {FIELD_CHANGE_LABEL[change.kind]}
                      {change.from && change.to ? ` (${change.from} → ${change.to})` : ""}
                    </p>
                  ))}
                </div>
              ) : null}

              {error ? <p className="text-error text-sm">{error}</p> : null}

              {selectedVersionId ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void restore()}
                  disabled={isRestoring}
                >
                  {isRestoring ? "Wird wiederhergestellt…" : "Version wiederherstellen"}
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
