"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Play, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  saveWorkflowAction,
  toggleWorkflowStatusAction,
} from "@/features/workflow-builder/actions/workflow-actions";
import { runManualWorkflowAction } from "@/features/workflow-builder/actions/run-actions";
import { getTriggerConfig } from "@/lib/workflow-schema/nodes";
import { useWorkflowEditorStore } from "./workflow-editor-store";
import { TestRunDialog, type TestRunResponseOption } from "./test-run-dialog";
import type { WorkflowStatus } from "@/lib/db/repositories/workflows";

export function WorkflowEditorToolbar({
  workspaceId,
  workflowId,
  name,
  initialStatus,
  responses,
}: {
  workspaceId: string;
  workflowId: string;
  name: string;
  initialStatus: WorkflowStatus;
  responses: TestRunResponseOption[];
}) {
  const dirty = useWorkflowEditorStore((s) => s.dirty);
  const saving = useWorkflowEditorStore((s) => s.saving);
  const saveError = useWorkflowEditorStore((s) => s.saveError);
  const getDefinition = useWorkflowEditorStore((s) => s.getDefinition);
  const validate = useWorkflowEditorStore((s) => s.validate);
  const markSaved = useWorkflowEditorStore((s) => s.setSaving);
  const commitSaved = useWorkflowEditorStore((s) => s.markSaved);
  const setSaveError = useWorkflowEditorStore((s) => s.setSaveError);

  const [status, setStatus] = useState(initialStatus);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [togglePending, setTogglePending] = useState(false);
  const [runPending, setRunPending] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const validation = validate();
  const isManualTrigger = getTriggerConfig(getDefinition().nodes)?.event === "manual";

  async function handleSave() {
    markSaved(true);
    const result = await saveWorkflowAction({ workflowId, definition: getDefinition() });
    if (result.ok) {
      commitSaved();
    } else {
      setSaveError(result.error ?? "Speichern fehlgeschlagen.");
    }
  }

  async function handleToggle(checked: boolean) {
    const nextStatus: WorkflowStatus = checked ? "enabled" : "paused";
    setToggleError(null);
    setTogglePending(true);
    // Enabling requires the latest saved definition — save first if dirty.
    if (dirty) await handleSave();
    const result = await toggleWorkflowStatusAction(
      workflowId,
      workspaceId,
      nextStatus,
      getDefinition(),
    );
    setStatus(result.status);
    if (result.error) setToggleError(result.error);
    setTogglePending(false);
  }

  async function handleRunManual() {
    setRunError(null);
    setRunPending(true);
    const result = await runManualWorkflowAction({ workflowId });
    if (!result.ok) setRunError(result.error ?? "Ausführung fehlgeschlagen.");
    setRunPending(false);
  }

  return (
    <div className="border-border bg-surface flex min-h-14 w-full shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/workflows"
          className="text-text-secondary hover:text-text-primary flex shrink-0 items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" />
          Zurück
        </Link>
        <span className="text-border">|</span>
        <span className="text-text-primary truncate text-sm font-medium">{name}</span>
        {validation.errors.length > 0 ? (
          <span className="text-error flex items-center gap-1 text-xs font-medium">
            <TriangleAlert className="size-3.5" />
            {validation.errors.length} Fehler
          </span>
        ) : validation.warnings.length > 0 ? (
          <span className="text-warning flex items-center gap-1 text-xs font-medium">
            <TriangleAlert className="size-3.5" />
            {validation.warnings.length} Warnung{validation.warnings.length === 1 ? "" : "en"}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
        <Link
          href={`/workflows/${workflowId}/runs`}
          className="text-text-secondary hover:text-text-primary text-sm"
        >
          Läufe
        </Link>
        <TestRunDialog workflowId={workflowId} responses={responses} />
        {isManualTrigger ? (
          <Button
            type="button"
            variant="secondary"
            onClick={handleRunManual}
            disabled={runPending || dirty || status !== "enabled"}
            title={
              dirty
                ? "Erst speichern, dann ausführen."
                : status !== "enabled"
                  ? "Der Workflow muss aktiviert sein."
                  : undefined
            }
          >
            <Play className="size-4" />
            {runPending ? "Läuft …" : "Jetzt ausführen"}
          </Button>
        ) : null}
        {runError ? <span className="text-error text-xs">{runError}</span> : null}
        {toggleError ? <span className="text-error text-xs">{toggleError}</span> : null}
        <div className="flex items-center gap-2">
          <span className="text-text-secondary text-sm">Aktiviert</span>
          <Switch
            checked={status === "enabled"}
            disabled={togglePending || (status === "paused" && validation.errors.length > 0)}
            onCheckedChange={handleToggle}
          />
        </div>

        {saveError ? <span className="text-error text-sm">{saveError}</span> : null}
        <Button type="button" variant="primary" onClick={handleSave} disabled={saving || !dirty}>
          {saving ? "Speichert …" : dirty ? "Speichern" : "Gespeichert"}
        </Button>
      </div>
    </div>
  );
}
