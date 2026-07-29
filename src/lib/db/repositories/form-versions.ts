import "server-only";
import { AppError } from "@/lib/errors";
import { createUserClient } from "@/lib/db/user-client";
import type { FormDefinition } from "@/lib/form-schema/schema";

export interface FormVersionSummary {
  id: string;
  versionNumber: number;
  createdAt: string;
  createdBy: string;
}

/** Version history (plan §14 "Versionshistorie") — immutable snapshots, newest first. */
export async function listFormVersions(formId: string): Promise<FormVersionSummary[]> {
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("form_versions")
    .select("id, version_number, created_at, created_by")
    .eq("form_id", formId)
    .order("version_number", { ascending: false });

  if (error) {
    throw new AppError("INTERNAL_ERROR", "Versionshistorie konnte nicht geladen werden.", {
      cause: error,
    });
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    versionNumber: row.version_number,
    createdAt: row.created_at,
    createdBy: row.created_by,
  }));
}

export interface FormVersionDetail extends FormVersionSummary {
  definition: FormDefinition;
}

export async function getFormVersion(versionId: string): Promise<FormVersionDetail | null> {
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("form_versions")
    .select("id, version_number, created_at, created_by, definition")
    .eq("id", versionId)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL_ERROR", "Version konnte nicht geladen werden.", { cause: error });
  }
  if (!data) return null;

  return {
    id: data.id,
    versionNumber: data.version_number,
    createdAt: data.created_at,
    createdBy: data.created_by,
    definition: data.definition as unknown as FormDefinition,
  };
}

/**
 * Restores an older version's definition into the current draft (plan §14
 * "ältere Version wiederherstellen") — this is a normal draft edit, using
 * the same optimistic-concurrency `save_form_draft` path as autosave. The
 * restored content becomes a new pending draft; it is NOT itself a new
 * version until the user explicitly publishes again.
 */
export async function restoreFormVersion(
  formId: string,
  expectedRevision: number,
  versionDefinition: FormDefinition,
): Promise<{ newRevision: number }> {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("save_form_draft", {
    p_form_id: formId,
    p_expected_revision: expectedRevision,
    p_definition: versionDefinition,
  });

  if (error) {
    throw new AppError("FORBIDDEN", "Version konnte nicht wiederhergestellt werden.", {
      cause: error,
    });
  }
  const row = data?.[0];
  if (!row) {
    throw new AppError("CONFLICT", "Der Entwurf wurde zwischenzeitlich geändert.");
  }
  return { newRevision: row.draft_revision };
}
