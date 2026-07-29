import { z } from "zod";
import { fieldSchema } from "./fields";

/** A single page of the form — plan §4.1. Field order = array order. */
export const pageSchema = z.object({
  id: z.string(),
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  fields: z.array(fieldSchema).max(50),
});
export type Page = z.infer<typeof pageSchema>;

export const endingSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  buttonLabel: z.string().max(100).optional(),
  redirectUrl: z.string().url().optional(),
  isDefault: z.boolean().default(false),
});
export type Ending = z.infer<typeof endingSchema>;
