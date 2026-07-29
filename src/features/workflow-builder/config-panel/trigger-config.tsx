"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { WorkflowNode } from "@/lib/workflow-schema/schema";
import type { WorkflowFormRef } from "@/lib/workflow-schema/validate";

type TriggerConfig = Extract<WorkflowNode, { type: "trigger" }>["config"];

/**
 * Trigger form selection — a workflow's trigger fires whenever a submission
 * arrives on any of the checked forms (0013: workflows are workspace-scoped
 * and can be triggered by multiple forms). `forms` is the full workspace
 * form list (not just previously-selected ones), so the user can add more.
 */
export function TriggerConfigForm({
  config,
  forms,
  onChange,
}: {
  config: TriggerConfig;
  forms: WorkflowFormRef[];
  onChange: (config: TriggerConfig) => void;
}) {
  const selected = new Set(config.formIds);

  function toggle(formId: string, checked: boolean) {
    const next = checked
      ? [...new Set([...config.formIds, formId])]
      : config.formIds.filter((id) => id !== formId);
    onChange({ ...config, formIds: next });
  }

  return (
    <div className="space-y-3">
      <p className="text-text-secondary text-sm">
        Wird ausgelöst, sobald eine neue Antwort für eines der ausgewählten Formulare eingeht.
      </p>

      {forms.length === 0 ? (
        <p className="text-text-muted text-sm">Keine Formulare im Workspace gefunden.</p>
      ) : (
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {forms.map((form) => (
            <div key={form.id} className="flex items-center gap-2">
              <Checkbox
                id={`trigger-form-${form.id}`}
                checked={selected.has(form.id)}
                onCheckedChange={(checked) => toggle(form.id, checked === true)}
              />
              <Label htmlFor={`trigger-form-${form.id}`} className="text-text-primary text-sm font-normal">
                {form.title}
              </Label>
            </div>
          ))}
        </div>
      )}

      {config.formIds.length === 0 ? (
        <p className="text-warning text-xs">
          Ohne ausgewähltes Formular kann der Workflow nicht aktiviert werden.
        </p>
      ) : null}
    </div>
  );
}
