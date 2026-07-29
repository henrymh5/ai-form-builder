"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { checkWebhookUrl } from "@/lib/workflow-schema/webhook-url";
import type { WorkflowNode } from "@/lib/workflow-schema/schema";

type WebhookConfig = Extract<WorkflowNode, { type: "webhook" }>["config"];

export function WebhookConfigForm({
  config,
  webhookSecret,
  onChange,
}: {
  config: WebhookConfig;
  webhookSecret: string | null;
  onChange: (config: WebhookConfig) => void;
}) {
  const urlCheck = config.url ? checkWebhookUrl(config.url) : { ok: true };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="webhook-url">Ziel-URL</Label>
        <Input
          id="webhook-url"
          value={config.url}
          onChange={(e) => onChange({ ...config, url: e.target.value })}
          placeholder="https://example.com/webhooks/formcraft"
        />
        {!urlCheck.ok ? <p className="text-error text-xs">{urlCheck.reason}</p> : null}
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="webhook-include-answers" className="text-text-secondary">
          Antworten mitsenden
        </Label>
        <Switch
          id="webhook-include-answers"
          checked={config.includeAnswers}
          onCheckedChange={(checked) => onChange({ ...config, includeAnswers: checked })}
        />
      </div>

      {webhookSecret ? (
        <div className="space-y-1.5">
          <Label>Signatur-Secret</Label>
          <p className="text-text-secondary bg-surface-subtle rounded-md p-2 font-mono text-xs break-all">
            {webhookSecret}
          </p>
          <p className="text-text-muted text-xs">
            Wird als HMAC-SHA256 im Header <code>X-FormCraft-Signature</code> gesendet.
          </p>
        </div>
      ) : null}
    </div>
  );
}
