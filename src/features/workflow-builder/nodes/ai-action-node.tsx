import { Sparkles } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import { NodeShell } from "./node-shell";
import type { FlowNode } from "../to-flow";

const TASK_LABEL: Record<"summarize" | "classify" | "translate", string> = {
  summarize: "Zusammenfassen",
  classify: "Einordnen",
  translate: "Übersetzen",
};

export function AiActionNode({ data, selected }: NodeProps<FlowNode>) {
  const config = data.type === "aiAction" ? data.config : null;

  return (
    <NodeShell
      icon={<Sparkles className="size-3.5" />}
      label="KI-Aktion"
      summary={config ? TASK_LABEL[config.task] : ""}
      selected={selected}
    />
  );
}
