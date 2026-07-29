import { z } from "zod";

/**
 * Field type definitions — plan §4.1. Each field type is its own Zod object
 * with only the properties valid for that type, combined into a discriminated
 * union on `type`. Display-only types (heading/paragraph/divider) have no
 * `key`/`required`/`validation`.
 */

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

/** Internal field key — stable identifier used in answers, conditions, CSV headers. */
const fieldKeySchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[a-z][a-z0-9_]*$/,
    "Key muss mit einem Kleinbuchstaben beginnen und darf nur a-z, 0-9, _ enthalten.",
  );

export const optionSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(200),
  value: z.string().min(1).max(200),
});
export type Option = z.infer<typeof optionSchema>;

const baseFieldFields = {
  id: z.string(),
  key: fieldKeySchema,
  label: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  placeholder: z.string().max(200).optional(),
  required: z.boolean().default(false),
};

// ---------------------------------------------------------------------------
// Validation rules — one shape per family of field types (plan §4.1/§9)
// ---------------------------------------------------------------------------

export const textValidationSchema = z.object({
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(1).max(5000).optional(),
  pattern: z.string().max(500).optional(),
  errorMessage: z.string().max(300).optional(),
});
export type TextValidation = z.infer<typeof textValidationSchema>;

export const numberValidationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  integer: z.boolean().optional(),
  errorMessage: z.string().max(300).optional(),
});
export type NumberValidation = z.infer<typeof numberValidationSchema>;

export const choiceValidationSchema = z.object({
  minSelections: z.number().int().min(0).optional(),
  maxSelections: z.number().int().min(1).optional(),
  errorMessage: z.string().max(300).optional(),
});
export type ChoiceValidation = z.infer<typeof choiceValidationSchema>;

export const fileValidationSchema = z.object({
  allowedFileTypes: z.array(z.string().min(1).max(50)).max(30).optional(),
  maxFileSizeBytes: z
    .number()
    .int()
    .min(1)
    .max(50 * 1024 * 1024)
    .optional(),
  maxFiles: z.number().int().min(1).max(10).optional(),
  errorMessage: z.string().max(300).optional(),
});
export type FileValidation = z.infer<typeof fileValidationSchema>;

// ---------------------------------------------------------------------------
// Input field types
// ---------------------------------------------------------------------------

export const shortTextFieldSchema = z.object({
  ...baseFieldFields,
  type: z.literal("short_text"),
  validation: textValidationSchema.optional(),
  defaultValue: z.string().max(5000).optional(),
});

export const longTextFieldSchema = z.object({
  ...baseFieldFields,
  type: z.literal("long_text"),
  validation: textValidationSchema.optional(),
  defaultValue: z.string().max(5000).optional(),
});

export const emailFieldSchema = z.object({
  ...baseFieldFields,
  type: z.literal("email"),
  validation: textValidationSchema.optional(),
  defaultValue: z.string().max(320).optional(),
});

export const phoneFieldSchema = z.object({
  ...baseFieldFields,
  type: z.literal("phone"),
  validation: textValidationSchema.optional(),
  defaultValue: z.string().max(50).optional(),
});

export const urlFieldSchema = z.object({
  ...baseFieldFields,
  type: z.literal("url"),
  validation: textValidationSchema.optional(),
  defaultValue: z.string().max(2000).optional(),
});

export const numberFieldSchema = z.object({
  ...baseFieldFields,
  type: z.literal("number"),
  validation: numberValidationSchema.optional(),
  defaultValue: z.number().optional(),
});

export const dateFieldSchema = z.object({
  ...baseFieldFields,
  type: z.literal("date"),
  defaultValue: z.string().optional(), // ISO 8601 date
});

export const timeFieldSchema = z.object({
  ...baseFieldFields,
  type: z.literal("time"),
  defaultValue: z.string().optional(), // HH:mm
});

// ---------------------------------------------------------------------------
// Choice field types
// ---------------------------------------------------------------------------

const optionsFieldFields = {
  ...baseFieldFields,
  options: z.array(optionSchema).min(1).max(20),
};

export const singleChoiceFieldSchema = z.object({
  ...optionsFieldFields,
  type: z.literal("single_choice"),
  defaultValue: z.string().optional(),
});

export const multipleChoiceFieldSchema = z.object({
  ...optionsFieldFields,
  type: z.literal("multiple_choice"),
  validation: choiceValidationSchema.optional(),
  defaultValue: z.array(z.string()).optional(),
});

export const dropdownFieldSchema = z.object({
  ...optionsFieldFields,
  type: z.literal("dropdown"),
  defaultValue: z.string().optional(),
});

export const yesNoFieldSchema = z.object({
  ...baseFieldFields,
  type: z.literal("yes_no"),
  defaultValue: z.boolean().optional(),
});

export const ratingFieldSchema = z.object({
  ...baseFieldFields,
  type: z.literal("rating"),
  maxRating: z.number().int().min(2).max(10).default(5),
  defaultValue: z.number().int().optional(),
});

export const starRatingFieldSchema = z.object({
  ...baseFieldFields,
  type: z.literal("star_rating"),
  maxRating: z.number().int().min(2).max(10).default(5),
  defaultValue: z.number().int().optional(),
});

export const npsFieldSchema = z.object({
  ...baseFieldFields,
  type: z.literal("nps"),
  defaultValue: z.number().int().min(0).max(10).optional(),
});

// ---------------------------------------------------------------------------
// Advanced field types
// ---------------------------------------------------------------------------

export const fileUploadFieldSchema = z.object({
  ...baseFieldFields,
  type: z.literal("file_upload"),
  validation: fileValidationSchema.optional(),
});

export const consentFieldSchema = z.object({
  ...baseFieldFields,
  type: z.literal("consent"),
  defaultValue: z.boolean().optional(),
});

export const hiddenFieldSchema = z.object({
  ...baseFieldFields,
  type: z.literal("hidden"),
  defaultValue: z.string().max(2000).optional(),
});

// ---------------------------------------------------------------------------
// Display-only types — no key/required/validation/defaultValue
// ---------------------------------------------------------------------------

export const headingFieldSchema = z.object({
  id: z.string(),
  type: z.literal("heading"),
  label: z.string().min(1).max(500),
});

export const paragraphFieldSchema = z.object({
  id: z.string(),
  type: z.literal("paragraph"),
  label: z.string().min(1).max(2000),
});

export const dividerFieldSchema = z.object({
  id: z.string(),
  type: z.literal("divider"),
});

// ---------------------------------------------------------------------------
// Discriminated union over all 20 field types
// ---------------------------------------------------------------------------

export const fieldSchema = z.discriminatedUnion("type", [
  shortTextFieldSchema,
  longTextFieldSchema,
  emailFieldSchema,
  phoneFieldSchema,
  urlFieldSchema,
  numberFieldSchema,
  dateFieldSchema,
  timeFieldSchema,
  singleChoiceFieldSchema,
  multipleChoiceFieldSchema,
  dropdownFieldSchema,
  yesNoFieldSchema,
  ratingFieldSchema,
  starRatingFieldSchema,
  npsFieldSchema,
  fileUploadFieldSchema,
  consentFieldSchema,
  hiddenFieldSchema,
  headingFieldSchema,
  paragraphFieldSchema,
  dividerFieldSchema,
]);

export type Field = z.infer<typeof fieldSchema>;
export type FieldType = Field["type"];

/** Field types that carry an answer (i.e. are not pure display elements). */
export const ANSWERABLE_FIELD_TYPES: readonly FieldType[] = [
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
  "hidden",
];

export const DISPLAY_ONLY_FIELD_TYPES: readonly FieldType[] = ["heading", "paragraph", "divider"];

export function isAnswerableField(field: Field): boolean {
  return (ANSWERABLE_FIELD_TYPES as string[]).includes(field.type);
}

/** Field types that support an `options` array (choice-family fields). */
export const CHOICE_FIELD_TYPES: readonly FieldType[] = [
  "single_choice",
  "multiple_choice",
  "dropdown",
];

export function hasOptions(
  field: Field,
): field is Extract<Field, { type: "single_choice" | "multiple_choice" | "dropdown" }> {
  return (CHOICE_FIELD_TYPES as string[]).includes(field.type);
}
