import { z } from "zod";
import type { Field } from "@/lib/form-schema/schema";
import { compileFieldValidation } from "./compile-field";

/**
 * Compiles a Zod object schema for a set of fields (typically the fields on
 * one page, or the fields currently visible per the Logic Engine — Phase 2).
 * Keyed by `field.key`. Display-only fields are skipped (plan §4.1).
 */
export function compilePageSchema(fields: Field[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    if (!("key" in field)) continue; // display-only field types have no key
    const fieldSchema = compileFieldValidation(field);
    if (fieldSchema) {
      shape[field.key] = fieldSchema;
    }
  }

  return z.object(shape);
}
