"use client";

import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { startTestRunAction } from "@/features/workflow-builder/actions/run-actions";
import { useWorkflowEditorStore } from "./workflow-editor-store";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export interface TestRunResponseOption {
  id: string;
  formTitle: string;
  submittedAt: string;
}

/**
 * Dry-run test using a real, already-submitted response — actions are
 * simulated by the engine (RunContext.dryRun), so this never sends a real
 * email/webhook (see workflow-engine/actions/*). Requires a saved
 * definition, since the run executes the server's copy, not unsaved edits.
 * `responses` spans every one of the trigger's currently-saved forms (0013:
 * a workflow can be triggered by multiple forms) — formId for the run is
 * resolved server-side from the chosen response, never trusted client-side.
 */
export function TestRunDialog({
  workflowId,
  responses,
}: {
  workflowId: string;
  responses: TestRunResponseOption[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedResponseId, setSelectedResponseId] = useState<string | undefined>(
    responses[0]?.id,
  );
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const dirty = useWorkflowEditorStore((s) => s.dirty);
  const getDefinition = useWorkflowEditorStore((s) => s.getDefinition);

  async function handleRun() {
    if (!selectedResponseId) return;
    setPending(true);
    setResult(null);
    const outcome = await startTestRunAction({
      workflowId,
      responseId: selectedResponseId,
      definition: getDefinition(),
    });
    setResult(outcome);
    setPending(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <FlaskConical className="size-4" />
        Testlauf
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Testlauf starten</DialogTitle>
        </DialogHeader>

        {dirty ? (
          <p className="text-warning text-sm">
            Du hast ungespeicherte Änderungen. Der Testlauf verwendet die zuletzt gespeicherte
            Version.
          </p>
        ) : null}

        {responses.length === 0 ? (
          <p className="text-text-secondary text-sm">
            Es gibt noch keine Antworten in den ausgewählten Trigger-Formularen, mit denen getestet
            werden kann.
          </p>
        ) : (
          <div className="space-y-4">
            <Select value={selectedResponseId} onValueChange={setSelectedResponseId}>
              <SelectTrigger>
                <SelectValue placeholder="Antwort wählen" />
              </SelectTrigger>
              <SelectContent>
                {responses.map((response) => (
                  <SelectItem key={response.id} value={response.id}>
                    {response.formTitle} — {formatDateTime(response.submittedAt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-text-muted text-xs">
              Aktionen werden simuliert — es werden keine echten E-Mails oder Webhooks ausgelöst.
            </p>
          </div>
        )}

        {result ? (
          <p className={result.ok ? "text-success text-sm" : "text-error text-sm"}>
            {result.ok ? "Testlauf abgeschlossen. Details in der Lauf-Historie." : result.error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="primary"
            onClick={handleRun}
            disabled={pending || !selectedResponseId}
          >
            {pending ? "Läuft…" : "Testlauf starten"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
