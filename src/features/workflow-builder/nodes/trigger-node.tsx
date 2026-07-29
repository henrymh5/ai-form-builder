import { Zap } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import { NodeShell } from "./node-shell";
import type { FlowNode } from "../to-flow";

export function TriggerNode({ selected }: NodeProps<FlowNode>) {
  return (
    <NodeShell
      icon={<Zap className="size-3.5" />}
      label="Trigger"
      summary="Neue Formularantwort"
      selected={selected}
      showTarget={false}
    />
  );
}
