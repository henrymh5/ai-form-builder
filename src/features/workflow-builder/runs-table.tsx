"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { retryRunAction } from "@/features/workflow-builder/actions/run-actions";
import { RunStatusBadge } from "@/features/workflow-builder/run-status-badge";
import type {
  WorkflowRunStepRecord,
  WorkflowRunSummary,
} from "@/lib/db/repositories/workflow-runs";

const NODE_TYPE_LABEL: Record<string, string> = {
  trigger: "Trigger",
  condition: "Bedingung",
  email: "E-Mail",
  webhook: "Webhook",
  responseAction: "Antwort-Aktion",
  aiAction: "KI-Aktion",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RunsTable({
  runs,
  stepsByRunId,
}: {
  runs: WorkflowRunSummary[];
  stepsByRunId: Record<string, WorkflowRunStepRecord[]>;
}) {
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);

  async function handleRetry(runId: string) {
    setRetrying(runId);
    setRetryError(null);
    const formData = new FormData();
    formData.set("runId", runId);
    const result = await retryRunAction(formData);
    if (!result.ok) setRetryError(result.error ?? "Erneuter Versuch fehlgeschlagen.");
    setRetrying(null);
  }

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      {retryError ? <p className="text-error px-4 py-2 text-sm">{retryError}</p> : null}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-border bg-surface-subtle text-text-secondary border-b text-left">
            <th className="px-4 py-2 font-medium" />
            <th className="px-4 py-2 font-medium">Zeitpunkt</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Versuch</th>
            <th className="px-4 py-2 font-medium">Fehler</th>
            <th className="px-4 py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const isExpanded = expandedRunId === run.id;
            const steps = stepsByRunId[run.id] ?? [];
            const canRetry = run.status === "failed" && run.attempt < 3 && !run.isTest;

            return (
              <>
                <tr key={run.id} className="border-border hover:bg-surface-subtle border-b">
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      aria-label={isExpanded ? "Details einklappen" : "Details anzeigen"}
                      onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                      className="text-text-muted hover:text-text-primary"
                    >
                      {isExpanded ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    {formatDateTime(run.createdAt)}
                    {run.isTest ? (
                      <span className="text-text-muted ml-1.5 text-xs">(Test)</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2">
                    <RunStatusBadge status={run.status} />
                  </td>
                  <td className="text-text-secondary px-4 py-2">{run.attempt}</td>
                  <td className="text-error px-4 py-2 text-xs">{run.errorMessage ?? "–"}</td>
                  <td className="px-4 py-2 text-right">
                    {canRetry ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={retrying === run.id}
                        onClick={() => handleRetry(run.id)}
                      >
                        <RotateCw className="size-3.5" />
                        {retrying === run.id ? "Läuft…" : "Erneut versuchen"}
                      </Button>
                    ) : null}
                  </td>
                </tr>
                {isExpanded ? (
                  <tr key={`${run.id}-steps`} className="border-border bg-surface-subtle border-b">
                    <td />
                    <td colSpan={5} className="px-4 py-3">
                      {steps.length === 0 ? (
                        <p className="text-text-muted text-xs">Keine Schritte protokolliert.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {steps.map((step) => (
                            <li key={step.id} className="flex items-center gap-2 text-xs">
                              <RunStatusBadge
                                status={
                                  step.status === "running"
                                    ? "running"
                                    : step.status === "skipped"
                                      ? "queued"
                                      : step.status
                                }
                              />
                              <span className="text-text-primary font-medium">
                                {NODE_TYPE_LABEL[step.nodeType] ?? step.nodeType}
                              </span>
                              {step.errorMessage ? (
                                <span className="text-error">{step.errorMessage}</span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ) : null}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
