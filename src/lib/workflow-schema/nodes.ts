import { z } from "zod";
import { conditionRuleSchema } from "@/lib/form-schema/conditions";
import { checkWebhookUrl } from "./webhook-url";

/**
 * Workflow node definitions — one Zod object per node type combined into a
 * discriminated union on `type`, mirroring lib/form-schema/fields.ts.
 *
 * `position` is the manually (or AI-auto-layouted) placed canvas position,
 * persisted as part of the definition so the editor doesn't need a separate
 * layout store.
 */

const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const baseNodeFields = {
  id: z.string(),
  position: positionSchema,
};

/**
 * Forms attached to a trigger — for `response_submitted` they define WHICH
 * submissions fire the workflow; for every other trigger type they define
 * the digest scope (which forms' new responses feed the run's context).
 * Mirrored into the workflow_form_triggers join table by
 * lib/db/repositories/workflows.ts's syncWorkflowTriggerForms.
 * `.default([])` keeps pre-existing stored definitions parseable without a
 * schema-version bump.
 */
const triggerFormIdsSchema = z.array(z.string().uuid()).max(20).default([]);

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Trigger config — discriminated union on `event`. All times are UTC in v1
 * (an IANA `timezone` field is the documented v2 extension point).
 * Cross-field rules (weekly needs weekday, monthly needs dayOfMonth,
 * scheduled_once must be in the future) live in validate.ts — zod 4
 * discriminated-union options must stay plain objects.
 */
export const triggerConfigSchema = z.discriminatedUnion("event", [
  z.object({
    event: z.literal("response_submitted"),
    formIds: triggerFormIdsSchema,
  }),
  z.object({
    event: z.literal("schedule"),
    frequency: z.enum(["daily", "weekly", "monthly"]),
    /** "HH:mm" in UTC. */
    time: z.string().regex(TIME_PATTERN),
    /** ISO weekday, 1 = Montag … 7 = Sonntag. Required for weekly (validate.ts). */
    weekday: z.number().int().min(1).max(7).optional(),
    /** 1–31; values beyond the month's length clamp to its last day ("31 = Monatsende"). */
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    formIds: triggerFormIdsSchema,
  }),
  z.object({
    event: z.literal("scheduled_once"),
    /** ISO datetime (UTC). The workflow auto-pauses after firing. */
    runAt: z.iso.datetime(),
    formIds: triggerFormIdsSchema,
  }),
  z.object({
    event: z.literal("webhook_inbound"),
    formIds: triggerFormIdsSchema,
  }),
  z.object({
    event: z.literal("manual"),
    formIds: triggerFormIdsSchema,
  }),
]);
export type TriggerConfig = z.infer<typeof triggerConfigSchema>;
export type TriggerEvent = TriggerConfig["event"];

export const triggerNodeSchema = z.object({
  ...baseNodeFields,
  type: z.literal("trigger"),
  config: triggerConfigSchema,
});

export const conditionNodeSchema = z.object({
  ...baseNodeFields,
  type: z.literal("condition"),
  config: z.object({
    logic: z.enum(["and", "or"]),
    rules: z.array(conditionRuleSchema).min(1).max(10),
  }),
});

export const emailNodeSchema = z.object({
  ...baseNodeFields,
  type: z.literal("email"),
  config: z.object({
    to: z.enum(["creator", "submitter_field", "custom"]),
    submitterFieldId: z.string().optional(),
    customTo: z.string().email().optional(),
    subject: z.string().min(1).max(300),
    body: z.string().min(1).max(5000),
  }),
});

export const webhookNodeSchema = z.object({
  ...baseNodeFields,
  type: z.literal("webhook"),
  config: z.object({
    url: z
      .string()
      .url()
      .max(2000)
      .refine((url) => checkWebhookUrl(url).ok, {
        error: "Diese Webhook-URL ist nicht erlaubt (nur https, keine privaten/internen Adressen).",
      }),
    includeAnswers: z.boolean().default(true),
  }),
});

export const responseActionNodeSchema = z.object({
  ...baseNodeFields,
  type: z.literal("responseAction"),
  config: z.object({
    action: z.enum(["set_status", "append_note", "mark_read"]),
    status: z.enum(["completed", "spam", "archived"]).optional(),
    noteText: z.string().max(2000).optional(),
  }),
});

export const aiActionNodeSchema = z.object({
  ...baseNodeFields,
  type: z.literal("aiAction"),
  config: z.object({
    task: z.enum(["summarize", "classify", "translate"]),
    categories: z.array(z.string().min(1).max(100)).max(20).optional(),
    targetLanguage: z.string().min(2).max(10).optional(),
  }),
});

export const workflowNodeSchema = z.discriminatedUnion("type", [
  triggerNodeSchema,
  conditionNodeSchema,
  emailNodeSchema,
  webhookNodeSchema,
  responseActionNodeSchema,
  aiActionNodeSchema,
]);
export type WorkflowNode = z.infer<typeof workflowNodeSchema>;
export type WorkflowNodeType = WorkflowNode["type"];

/** Node types that perform a real side effect when executed. */
export const ACTION_NODE_TYPES: readonly WorkflowNodeType[] = [
  "email",
  "webhook",
  "responseAction",
  "aiAction",
];

export const workflowEdgeHandleSchema = z.enum(["out", "true", "false"]);
export type WorkflowEdgeHandle = z.infer<typeof workflowEdgeHandleSchema>;

export const workflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: workflowEdgeHandleSchema.default("out"),
});
export type WorkflowEdge = z.infer<typeof workflowEdgeSchema>;

/** Handles valid for a given node type — condition branches, everything else is a single "out". */
export function allowedHandlesFor(type: WorkflowNodeType): readonly WorkflowEdgeHandle[] {
  return type === "condition" ? ["true", "false"] : ["out"];
}

/** Extracts the trigger node's config from a node list — null when no trigger exists. */
export function getTriggerConfig(nodes: WorkflowNode[]): TriggerConfig | null {
  const trigger = nodes.find((n) => n.type === "trigger");
  return trigger && trigger.type === "trigger" ? trigger.config : null;
}

const WEEKDAY_LABEL: Record<number, string> = {
  1: "montags",
  2: "dienstags",
  3: "mittwochs",
  4: "donnerstags",
  5: "freitags",
  6: "samstags",
  7: "sonntags",
};

function formatRunAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return (
    date.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }) + " (UTC)"
  );
}

/** German one-line summary of a trigger config — used by the canvas node, workflow card, and runs UI. */
export function describeTrigger(config: TriggerConfig | null): string {
  if (!config) return "Kein Trigger";
  switch (config.event) {
    case "response_submitted":
      return "Neue Formularantwort";
    case "schedule":
      switch (config.frequency) {
        case "daily":
          return `Zeitplan: täglich ${config.time} (UTC)`;
        case "weekly":
          return `Zeitplan: ${WEEKDAY_LABEL[config.weekday ?? 1]} ${config.time} (UTC)`;
        case "monthly":
          return `Zeitplan: monatlich am ${config.dayOfMonth ?? 1}. um ${config.time} (UTC)`;
      }
      break;
    case "scheduled_once":
      return `Einmalig: ${formatRunAt(config.runAt)}`;
    case "webhook_inbound":
      return "Eingehender Webhook";
    case "manual":
      return "Manueller Auslöser";
  }
  return "Kein Trigger";
}
