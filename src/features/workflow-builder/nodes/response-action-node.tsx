import { FileEdit } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import { NodeShell } from "./node-shell";
import type { FlowNode } from "../to-flow";

const ACTION_LABEL: Record<"set_status" | "append_note" | "mark_read", string> = {
  set_status: "Status setzen",
  append_note: "Notiz hinzufügen",
  mark_read: "Als gelesen markieren",
};

const STATUS_LABEL: Record<"completed" | "spam" | "archived", string> = {
  completed: "Abgeschlossen",
  spam: "Spam",
  archived: "Archiviert",
};

export function ResponseActionNode({ data, selected }: NodeProps<FlowNode>) {
  const config = data.type === "responseAction" ? data.config : null;
  const summary = config
    ? config.action === "set_status" && config.status
      ? `${ACTION_LABEL[config.action]}: ${STATUS_LABEL[config.status]}`
      : ACTION_LABEL[config.action]
    : "";

  return (
    <NodeShell
      icon={<FileEdit className="size-3.5" />}
      label="Antwort-Aktion"
      summary={summary}
      selected={selected}
    />
  );
}
