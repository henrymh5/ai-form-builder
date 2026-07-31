"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NODE_TYPE_META } from "../node-types";
import { useWorkflowEditorStore } from "../workflow-editor-store";
import { AiActionConfigForm } from "./ai-action-config";
import { ConditionConfigForm } from "./condition-config";
import { EmailConfigForm } from "./email-config";
import { ResponseActionConfigForm } from "./response-action-config";
import { TriggerConfigForm } from "./trigger-config";
import { WebhookConfigForm } from "./webhook-config";

/** Right sidebar: config form for the selected node — mirrors form-builder/properties-panel.tsx's role. */
export function ConfigPanel({
  webhookSecret,
  inboundToken,
}: {
  webhookSecret: string | null;
  inboundToken: string | null;
}) {
  const nodes = useWorkflowEditorStore((s) => s.nodes);
  const selectedNodeId = useWorkflowEditorStore((s) => s.selectedNodeId);
  const forms = useWorkflowEditorStore((s) => s.forms);
  const updateNodeConfig = useWorkflowEditorStore((s) => s.updateNodeConfig);
  const removeNode = useWorkflowEditorStore((s) => s.removeNode);
  const getTriggerFormRefs = useWorkflowEditorStore((s) => s.getTriggerFormRefs);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <aside className="border-border bg-surface w-80 shrink-0 border-l p-4">
        <p className="text-text-secondary text-sm">
          Wähle einen Knoten aus, um seine Eigenschaften zu bearbeiten.
        </p>
      </aside>
    );
  }

  const meta = NODE_TYPE_META[selectedNode.data.type];
  // Everything except the trigger works against the trigger's currently
  // selected forms — a condition/email/etc. field must exist on at least
  // one form the trigger can actually fire from.
  const triggerForms = getTriggerFormRefs();

  return (
    <aside className="border-border bg-surface w-80 shrink-0 space-y-5 overflow-y-auto border-l p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-text-primary text-sm font-semibold">{meta.label}</h2>
        {selectedNode.data.type !== "trigger" ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Knoten löschen"
            onClick={() => removeNode(selectedNode.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>

      {selectedNode.data.type === "trigger" ? (
        <TriggerConfigForm
          config={selectedNode.data.config}
          forms={forms}
          inboundToken={inboundToken}
          onChange={(config) => updateNodeConfig(selectedNode.id, config)}
        />
      ) : selectedNode.data.type === "condition" ? (
        <ConditionConfigForm
          config={selectedNode.data.config}
          forms={triggerForms}
          onChange={(config) => updateNodeConfig(selectedNode.id, config)}
        />
      ) : selectedNode.data.type === "email" ? (
        <EmailConfigForm
          config={selectedNode.data.config}
          forms={triggerForms}
          onChange={(config) => updateNodeConfig(selectedNode.id, config)}
        />
      ) : selectedNode.data.type === "webhook" ? (
        <WebhookConfigForm
          config={selectedNode.data.config}
          webhookSecret={webhookSecret}
          onChange={(config) => updateNodeConfig(selectedNode.id, config)}
        />
      ) : selectedNode.data.type === "responseAction" ? (
        <ResponseActionConfigForm
          config={selectedNode.data.config}
          forms={triggerForms}
          onChange={(config) => updateNodeConfig(selectedNode.id, config)}
        />
      ) : selectedNode.data.type === "aiAction" ? (
        <AiActionConfigForm
          config={selectedNode.data.config}
          onChange={(config) => updateNodeConfig(selectedNode.id, config)}
        />
      ) : null}
    </aside>
  );
}
