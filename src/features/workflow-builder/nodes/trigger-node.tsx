import { Zap } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import { describeTrigger } from "@/lib/workflow-schema/nodes";
import { NodeShell } from "./node-shell";
import type { FlowNode } from "../to-flow";

export function TriggerNode({ data, selected }: NodeProps<FlowNode>) {
  const config = data.type === "trigger" ? data.config : null;
  return (
    <NodeShell
      icon={<Zap className="size-3.5" />}
      label="Trigger"
      summary={describeTrigger(config)}
      selected={selected}
      showTarget={false}
    />
  );
}
