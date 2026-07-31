import { z } from "zod";
import type { Field } from "@/lib/form-schema/schema";

/**
 * Compiles a single field's declarative validation into a runtime Zod
 * schema for its answer value. This is the ONE implementation used by the
 * client (React Hook Form resolver) and the server (submission revalidation)
 * — plan §2.3 / §11.2. Never duplicate this logic elsewhere.
 *
 * Returns `undefined` for display-only field types (heading/paragraph/divider),
 * which never carry an answer.
 */
export function compileFieldValidation(field: Field): z.ZodTypeAny | undefined {
  switch (field.type) {
    case "short_text":
    case "long_text": {
      let schema: z.ZodString = z.string();
      if (field.validation?.minLength !== undefined) {
        schema = schema.min(field.validation.minLength, field.validation.errorMessage);
      }
      if (field.validation?.maxLength !== undefined) {
        schema = schema.max(field.validation.maxLength, field.validation.errorMessage);
      }
      if (field.validation?.pattern) {
        schema = schema.regex(new RegExp(field.validation.pattern), field.validation.errorMessage);
      }
      return applyRequired(schema, field.required, field.validation?.errorMessage);
    }

    case "email": {
      let schema: z.ZodString = z.string().email(field.validation?.errorMessage);
      if (field.validation?.maxLength !== undefined) {
        schema = schema.max(field.validation.maxLength, field.validation.errorMessage);
      }
      return applyRequired(schema, field.required, field.validation?.errorMessage);
    }

    case "url": {
      const schema = z.string().url(field.validation?.errorMessage);
      return applyRequired(schema, field.required, field.validation?.errorMessage);
    }

    case "phone": {
      let schema: z.ZodString = z.string();
      if (field.validation?.pattern) {
        schema = schema.regex(new RegExp(field.validation.pattern), field.validation.errorMessage);
      }
      return applyRequired(schema, field.required, field.validation?.errorMessage);
    }

    case "number": {
      let schema: z.ZodNumber = z.number();
      if (field.validation?.integer) {
        schema = schema.int(field.validation.errorMessage);
      }
      if (field.validation?.min !== undefined) {
        schema = schema.min(field.validation.min, field.validation.errorMessage);
      }
      if (field.validation?.max !== undefined) {
        schema = schema.max(field.validation.max, field.validation.errorMessage);
      }
      return applyRequired(schema, field.required, field.validation?.errorMessage, true);
    }

    case "date":
    case "time": {
      const schema = z.string().min(1);
      return applyRequired(schema, field.required);
    }

    case "single_choice":
    case "dropdown": {
      const values = new Set(field.options.map((o) => o.value));
      const schema = z.string().refine((v) => values.has(v), "Ungültige Auswahl.");
      return applyRequired(schema, field.required);
    }

    case "multiple_choice": {
      const values = new Set(field.options.map((o) => o.value));
      let schema: z.ZodArray<z.ZodString> = z.array(
        z.string().refine((v) => values.has(v), "Ungültige Auswahl."),
      );
      if (field.validation?.minSelections !== undefined) {
        schema = schema.min(field.validation.minSelections, field.validation.errorMessage);
      } else if (field.required) {
        schema = schema.min(1, field.validation?.errorMessage ?? "Pflichtfeld.");
      }
      if (field.validation?.maxSelections !== undefined) {
        schema = schema.max(field.validation.maxSelections, field.validation.errorMessage);
      }
      return schema;
    }

    case "yes_no":
      return applyRequired(z.boolean(), field.required, undefined, true);

    case "rating":
    case "star_rating": {
      const schema = z.number().int().min(1).max(field.maxRating);
      return applyRequired(schema, field.required, undefined, true);
    }

    case "nps":
      return applyRequired(z.number().int().min(0).max(10), field.required, undefined, true);

    case "file_upload": {
      let schema: z.ZodArray<z.ZodString> = z.array(z.string());
      if (field.validation?.maxFiles !== undefined) {
        schema = schema.max(field.validation.maxFiles, field.validation.errorMessage);
      }
      if (field.required) {
        schema = schema.min(1, field.validation?.errorMessage ?? "Pflichtfeld.");
      }
      return schema;
    }

    case "consent":
      return field.required
        ? z.literal(true, { message: "Diese Einwilligung ist erforderlich." })
        : z.boolean();

    case "hidden":
      return z.string().optional();

    case "heading":
    case "paragraph":
    case "divider":
      return undefined;
  }
}

function applyRequired<T extends z.ZodTypeAny>(
  schema: T,
  required: boolean,
  errorMessage?: string,
  // Numbers/booleans can't be non-empty-checked — just make them non-optional.
  nonStringRequired = false,
): z.ZodTypeAny {
  if (!required) {
    // An untouched text-like input submits "" rather than undefined, so `.optional()`
    // alone would still run the inner checks (e.g. `min(1)`) against the empty string
    // and reject a field the user was never required to fill.
    if (nonStringRequired) return schema.optional();
    return z.preprocess((value) => (value === "" ? undefined : value), schema.optional());
  }
  if (nonStringRequired) {
    return schema;
  }
  // String-like schemas (including refine()-wrapped ones): require non-empty.
  return schema.refine(
    (value) => typeof value === "string" && value.length > 0,
    errorMessage ?? "Pflichtfeld.",
  );
}
