import { Webhook } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import { NodeShell } from "./node-shell";
import type { FlowNode } from "../to-flow";

export function WebhookNode({ data, selected }: NodeProps<FlowNode>) {
  const config = data.type === "webhook" ? data.config : null;

  return (
    <NodeShell
      icon={<Webhook className="size-3.5" />}
      label="Webhook aufrufen"
      summary={config?.url || "Keine URL konfiguriert"}
      selected={selected}
    />
  );
}
