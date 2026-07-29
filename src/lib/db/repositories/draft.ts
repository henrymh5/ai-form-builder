import "server-only";
import { AppError } from "@/lib/errors";
import { createUserClient } from "@/lib/db/user-client";
import type { FormDefinition } from "@/lib/form-schema/schema";

/**
 * Optimistic-concurrency draft save (plan §6 Autosave). The RPC only
 * updates the row if `expectedRevision` still matches — a mismatch means
 * another tab/session saved first, surfaced to the client as a conflict so
 * it can reload rather than silently overwrite (plan §6 "Um Änderungen aus
 * mehreren geöffneten Browser-Tabs nicht gegenseitig zu überschreiben").
 */
export async function saveDraft(
  formId: string,
  expectedRevision: number,
  definition: FormDefinition,
): Promise<{ newRevision: number }> {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("save_form_draft", {
    p_form_id: formId,
    p_expected_revision: expectedRevision,
    p_definition: definition,
  });

  if (error) {
    throw new AppError("FORBIDDEN", "Entwurf konnte nicht gespeichert werden.", { cause: error });
  }

  const row = data?.[0];
  if (!row) {
    throw new AppError(
      "CONFLICT",
      "Der Entwurf wurde in einem anderen Tab geändert. Bitte neu laden.",
    );
  }

  return { newRevision: row.draft_revision };
}
