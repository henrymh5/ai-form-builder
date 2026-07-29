"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FormDefinition } from "@/lib/form-schema/schema";
import type { WorkflowNode } from "@/lib/workflow-schema/schema";
import { FieldPicker, insertFieldPlaceholder } from "./field-picker";

type ResponseActionConfig = Extract<WorkflowNode, { type: "responseAction" }>["config"];

export function ResponseActionConfigForm({
  config,
  form,
  onChange,
}: {
  config: ResponseActionConfig;
  form: FormDefinition;
  onChange: (config: ResponseActionConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Aktion</Label>
        <Select
          value={config.action}
          onValueChange={(value) =>
            onChange({ ...config, action: value as ResponseActionConfig["action"] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="set_status">Status setzen</SelectItem>
            <SelectItem value="append_note">Notiz hinzufügen</SelectItem>
            <SelectItem value="mark_read">Als gelesen markieren</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.action === "set_status" ? (
        <div className="space-y-1.5">
          <Label>Zielstatus</Label>
          <Select
            value={config.status}
            onValueChange={(value) =>
              onChange({ ...config, status: value as NonNullable<ResponseActionConfig["status"]> })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Status wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="completed">Abgeschlossen</SelectItem>
              <SelectItem value="spam">Spam</SelectItem>
              <SelectItem value="archived">Archiviert</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {config.action === "append_note" ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="note-text">Notiztext</Label>
            <FieldPicker
              form={form}
              value={undefined}
              placeholder="Platzhalter einfügen"
              onChange={(fieldId) =>
                onChange({ ...config, noteText: insertFieldPlaceholder(config.noteText ?? "", fieldId) })
              }
            />
          </div>
          <Textarea
            id="note-text"
            value={config.noteText ?? ""}
            onChange={(e) => onChange({ ...config, noteText: e.target.value })}
            rows={4}
          />
        </div>
      ) : null}
    </div>
  );
}
