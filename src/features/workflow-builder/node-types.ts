import { FileEdit, GitBranch, Mail, Sparkles, Webhook, Zap, type LucideIcon } from "lucide-react";
import type { NodeTypes } from "@xyflow/react";
import type { WorkflowNodeType } from "@/lib/workflow-schema/schema";
import { AiActionNode } from "./nodes/ai-action-node";
import { ConditionNode } from "./nodes/condition-node";
import { EmailNode } from "./nodes/email-node";
import { ResponseActionNode } from "./nodes/response-action-node";
import { TriggerNode } from "./nodes/trigger-node";
import { WebhookNode } from "./nodes/webhook-node";

export const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  email: EmailNode,
  webhook: WebhookNode,
  responseAction: ResponseActionNode,
  aiAction: AiActionNode,
};

export const PALETTE_NODE_TYPES: Exclude<WorkflowNodeType, "trigger">[] = [
  "condition",
  "email",
  "webhook",
  "responseAction",
  "aiAction",
];

export const NODE_TYPE_META: Record<WorkflowNodeType, { label: string; icon: LucideIcon }> = {
  trigger: { label: "Trigger", icon: Zap },
  condition: { label: "Bedingung", icon: GitBranch },
  email: { label: "E-Mail senden", icon: Mail },
  webhook: { label: "Webhook aufrufen", icon: Webhook },
  responseAction: { label: "Antwort-Aktion", icon: FileEdit },
  aiAction: { label: "KI-Aktion", icon: Sparkles },
};
