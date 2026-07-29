import { z } from "zod";
import { conditionSchema } from "./conditions";
import { endingSchema, pageSchema } from "./pages";
import { settingsSchema } from "./settings";
import { themeSchema } from "./theme";

export const CURRENT_SCHEMA_VERSION = 1;

export const metadataSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  language: z.string().min(2).max(10).default("de"),
});
export type Metadata = z.infer<typeof metadataSchema>;

/**
 * The canonical form schema (plan §4). Single source of truth consumed by
 * the builder, preview, public renderer, server validation, AI outputs,
 * publish gate, and version history.
 */
export const formDefinitionSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  metadata: metadataSchema,
  settings: settingsSchema,
  theme: themeSchema,
  pages: z.array(pageSchema).min(1).max(30),
  conditions: z.array(conditionSchema).max(50),
  endings: z.array(endingSchema).min(1).max(20),
});
export type FormDefinition = z.infer<typeof formDefinitionSchema>;

export * from "./conditions";
export * from "./fields";
export * from "./ids";
export * from "./pages";
export * from "./settings";
export * from "./theme";
