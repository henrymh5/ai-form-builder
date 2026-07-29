import { z } from "zod";

/** Form-level settings — plan §4.1. */
export const settingsSchema = z.object({
  progressDisplay: z.enum(["none", "bar", "percent", "steps"]).default("bar"),
  allowBack: z.boolean().default(true),
  allowMultipleSubmissions: z.boolean().default(false),
  captchaEnabled: z.boolean().default(false),
  honeypotEnabled: z.boolean().default(true),
});
export type Settings = z.infer<typeof settingsSchema>;
