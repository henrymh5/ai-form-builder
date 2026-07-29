import { Mail } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import { NodeShell } from "./node-shell";
import type { FlowNode } from "../to-flow";

const RECIPIENT_LABEL: Record<"creator" | "submitter_field" | "custom", string> = {
  creator: "an Ersteller",
  submitter_field: "an Antwortfeld",
  custom: "an feste Adresse",
};

export function EmailNode({ data, selected }: NodeProps<FlowNode>) {
  const config = data.type === "email" ? data.config : null;

  return (
    <NodeShell
      icon={<Mail className="size-3.5" />}
      label="E-Mail senden"
      summary={config ? `${RECIPIENT_LABEL[config.to]} · ${config.subject}` : ""}
      selected={selected}
    />
  );
}
