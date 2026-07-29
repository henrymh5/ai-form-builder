"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FormDefinition } from "@/lib/form-schema/schema";
import type { WorkflowNode } from "@/lib/workflow-schema/schema";
import { FieldPicker, insertFieldPlaceholder } from "./field-picker";

type EmailConfig = Extract<WorkflowNode, { type: "email" }>["config"];

export function EmailConfigForm({
  config,
  form,
  onChange,
}: {
  config: EmailConfig;
  form: FormDefinition;
  onChange: (config: EmailConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Empfänger</Label>
        <Select
          value={config.to}
          onValueChange={(value) =>
            onChange({ ...config, to: value as EmailConfig["to"] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="creator">Ersteller des Workflows</SelectItem>
            <SelectItem value="submitter_field">Antwortfeld (z. B. E-Mail-Frage)</SelectItem>
            <SelectItem value="custom">Feste Adresse</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.to === "submitter_field" ? (
        <div className="space-y-1.5">
          <Label>Empfängerfeld</Label>
          <FieldPicker
            form={form}
            value={config.submitterFieldId}
            onChange={(fieldId) => onChange({ ...config, submitterFieldId: fieldId })}
          />
        </div>
      ) : null}

      {config.to === "custom" ? (
        <div className="space-y-1.5">
          <Label htmlFor="email-custom-to">Empfängeradresse</Label>
          <Input
            id="email-custom-to"
            type="email"
            value={config.customTo ?? ""}
            onChange={(e) => onChange({ ...config, customTo: e.target.value })}
            placeholder="name@beispiel.de"
          />
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="email-subject">Betreff</Label>
        <Input
          id="email-subject"
          value={config.subject}
          onChange={(e) => onChange({ ...config, subject: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="email-body">Nachricht</Label>
          <FieldPicker
            form={form}
            value={undefined}
            placeholder="Platzhalter einfügen"
            onChange={(fieldId) =>
              onChange({ ...config, body: insertFieldPlaceholder(config.body, fieldId) })
            }
          />
        </div>
        <Textarea
          id="email-body"
          value={config.body}
          onChange={(e) => onChange({ ...config, body: e.target.value })}
          rows={6}
        />
        <p className="text-text-muted text-xs">
          Verfügbare Platzhalter: {"{{form:title}}"}, {"{{response:id}}"}, {"{{response:all}}"}
        </p>
      </div>
    </div>
  );
}
