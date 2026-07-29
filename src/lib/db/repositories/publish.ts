import "server-only";
import { formDefinitionSchema } from "@/lib/form-schema/schema";
import { validateFormDefinition, isValid } from "@/lib/form-schema/validate";
import { detectCycles, findPathsWithoutEnding, findUnreachablePages } from "@/lib/logic-engine/graph";
import { AppError } from "@/lib/errors";
import { createUserClient } from "@/lib/db/user-client";
import { getForm } from "@/lib/db/repositories/forms";

/**
 * Validates the current draft and publishes it as an immutable version
 * (plan §14 "Entwurf und Veröffentlichung trennen"). Business-rule
 * validation happens here, in the application layer, BEFORE calling
 * publish_form() — the database function only enforces the optimistic-
 * concurrency revision check and the atomic snapshot + pointer flip (0005).
 */
export async function publishForm(
  formId: string,
  expectedRevision: number,
  userId: string,
): Promise<{ versionNumber: number; versionId: string }> {
  const form = await getForm(formId);
  if (!form) {
    throw new AppError("NOT_FOUND", "Formular nicht gefunden.");
  }

  const shapeResult = formDefinitionSchema.safeParse(form.draftDefinition);
  if (!shapeResult.success) {
    throw new AppError("VALIDATION_ERROR", "Der Formularentwurf ist ungültig und kann nicht veröffentlicht werden.");
  }

  const validation = validateFormDefinition(shapeResult.data, {
    detectCycles,
    findUnreachablePages,
    findPathsWithoutEnding,
  });
  if (!isValid(validation)) {
    throw new AppError(
      "VALIDATION_ERROR",
      validation.errors[0]?.message ??
        "Der Formularentwurf enthält Fehler und kann nicht veröffentlicht werden.",
      { details: { errors: validation.errors } },
    );
  }

  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("publish_form", {
    p_form_id: formId,
    p_expected_revision: expectedRevision,
    p_user_id: userId,
  });

  if (error) {
    if (error.code === "P0001") {
      throw new AppError(
        "CONFLICT",
        "Der Entwurf wurde zwischenzeitlich geändert. Bitte neu laden und erneut veröffentlichen.",
      );
    }
    throw new AppError("FORBIDDEN", "Formular konnte nicht veröffentlicht werden.", { cause: error });
  }

  const row = data?.[0];
  if (!row) {
    throw new AppError("CONFLICT", "Der Entwurf wurde zwischenzeitlich geändert.");
  }

  return { versionNumber: row.version_number, versionId: row.version_id };
}
