import { GitBranch } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import { NodeShell } from "./node-shell";
import type { FlowNode } from "../to-flow";

export function ConditionNode({ data, selected }: NodeProps<FlowNode>) {
  const config = data.type === "condition" ? data.config : null;
  const summary = config
    ? `${config.rules.length} Bedingung${config.rules.length === 1 ? "" : "en"} (${config.logic === "and" ? "UND" : "ODER"})`
    : "";

  return (
    <NodeShell
      icon={<GitBranch className="size-3.5" />}
      label="Bedingung"
      summary={summary}
      selected={selected}
      outHandles={[
        { id: "true", label: "Ja", colorClass: "text-success" },
        { id: "false", label: "Nein", colorClass: "text-text-muted" },
      ]}
    />
  );
}
