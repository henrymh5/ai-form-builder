import { z } from "zod";

/**
 * AI-facing schemas (plan §11 "Strukturierte Ausgabe"). Deliberately a
 * simpler, flatter shape than the canonical `FormDefinition` — Claude never
 * produces IDs, internal `key`s, or schema-version numbers; those are
 * generated server-side (plan §6 "IDs dürfen nicht von Claude generiert
 * werden") by `toFormDefinition()` in `convert.ts`. This file is the JSON-
 * Schema-validated half of the double-validation pipeline; `lib/form-
 * schema/validate.ts` + the Logic Engine are the business-rules half.
 */

export const aiFieldTypeSchema = z.enum([
  "short_text",
  "long_text",
  "email",
  "phone",
  "url",
  "number",
  "date",
  "time",
  "single_choice",
  "multiple_choice",
  "dropdown",
  "yes_no",
  "rating",
  "star_rating",
  "nps",
  "file_upload",
  "consent",
  "heading",
  "paragraph",
]);

export const aiFieldSchema = z.object({
  type: aiFieldTypeSchema,
  label: z.string().min(1).max(500),
  description: z.string().max(1000).optional(),
  placeholder: z.string().max(200).optional(),
  required: z.boolean(),
  options: z.array(z.string().min(1).max(200)).max(20).optional(),
});
export type AiField = z.infer<typeof aiFieldSchema>;

export const aiPageSchema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  fields: z.array(aiFieldSchema).min(1).max(20),
});
export type AiPage = z.infer<typeof aiPageSchema>;

export const aiThemeSuggestionSchema = z.object({
  colorPrimary: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .optional(),
});

export const generateFormOutputSchema = z.object({
  title: z.string().min(1).max(200),
  introduction: z.string().max(1000).optional(),
  pages: z.array(aiPageSchema).min(1).max(15),
  endingTitle: z.string().min(1).max(200),
  themeSuggestion: aiThemeSuggestionSchema.optional(),
});
export type GenerateFormOutput = z.infer<typeof generateFormOutputSchema>;

export const generateFormInputSchema = z.object({
  description: z.string().min(10).max(2000),
});
export type GenerateFormInput = z.infer<typeof generateFormInputSchema>;

// ---------------------------------------------------------------------------
// rewrite-question:v1
// ---------------------------------------------------------------------------

export const rewriteQuestionInputSchema = z.object({
  label: z.string().min(1).max(500),
  description: z.string().max(1000).optional(),
  style: z.enum(["reword", "shorten", "friendlier"]),
});
export type RewriteQuestionInput = z.infer<typeof rewriteQuestionInputSchema>;

export const rewriteQuestionOutputSchema = z.object({
  label: z.string().min(1).max(500),
});
export type RewriteQuestionOutput = z.infer<typeof rewriteQuestionOutputSchema>;

// ---------------------------------------------------------------------------
// generate-options:v1
// ---------------------------------------------------------------------------

export const generateOptionsInputSchema = z.object({
  label: z.string().min(1).max(500),
  count: z.number().int().min(2).max(20).default(5),
});
export type GenerateOptionsInput = z.infer<typeof generateOptionsInputSchema>;

export const generateOptionsOutputSchema = z.object({
  options: z.array(z.string().min(1).max(200)).min(2).max(20),
});
export type GenerateOptionsOutput = z.infer<typeof generateOptionsOutputSchema>;
