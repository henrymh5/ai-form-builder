"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createBlankForm,
  duplicateForm,
  renameForm,
  setFormStatus,
  softDeleteForm,
} from "@/lib/db/repositories/forms";
import { publishForm as publishFormRepo } from "@/lib/db/repositories/publish";
import { saveDraft } from "@/lib/db/repositories/draft";
import { getFormVersion, restoreFormVersion } from "@/lib/db/repositories/form-versions";
import { getCurrentUser } from "@/lib/db/repositories/profile";
import { AppError, isAppError } from "@/lib/errors";
import { formDefinitionSchema } from "@/lib/form-schema/schema";

export interface FormActionState {
  error?: string;
}

export interface SaveDraftResult {
  newRevision: number;
}

/**
 * Autosave endpoint (plan §6): called directly (not via a `<form>`) from
 * the debounced autosave hook with the form ID, the client's current
 * revision, and the new definition — the DB rejects a stale revision
 * (optimistic concurrency across tabs).
 */
export async function saveDraftAction(
  formId: string,
  expectedRevision: number,
  definition: unknown,
): Promise<SaveDraftResult> {
  const parsed = formDefinitionSchema.safeParse(definition);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Der Formularentwurf ist ungültig.");
  }
  return saveDraft(formId, expectedRevision, parsed.data);
}

const createFormSchema = z.object({
  workspaceId: z.string().uuid(),
  title: z.string().min(1, "Bitte einen Titel angeben.").max(200),
});

export async function createBlankFormAction(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = createFormSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    title: formData.get("title"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const user = await getCurrentUser();
  if (!user) return { error: "Nicht angemeldet." };

  let formId: string;
  try {
    const form = await createBlankForm(parsed.data.workspaceId, user.id, parsed.data.title);
    formId = form.id;
  } catch (error) {
    return { error: isAppError(error) ? error.publicMessage : "Formular konnte nicht erstellt werden." };
  }

  redirect(`/forms/${formId}`);
}

const formIdSchema = z.object({ formId: z.string().uuid() });

export async function duplicateFormAction(formData: FormData): Promise<void> {
  const parsed = formIdSchema.safeParse({ formId: formData.get("formId") });
  if (!parsed.success) return;

  const user = await getCurrentUser();
  if (!user) return;

  await duplicateForm(parsed.data.formId, user.id);
  revalidatePath("/dashboard");
}

const renameFormSchema = z.object({
  formId: z.string().uuid(),
  title: z.string().min(1).max(200),
});

export async function renameFormAction(formData: FormData): Promise<void> {
  const parsed = renameFormSchema.safeParse({
    formId: formData.get("formId"),
    title: formData.get("title"),
  });
  if (!parsed.success) return;

  await renameForm(parsed.data.formId, parsed.data.title);
  revalidatePath("/dashboard");
}

export async function pauseFormAction(formData: FormData): Promise<void> {
  const parsed = formIdSchema.safeParse({ formId: formData.get("formId") });
  if (!parsed.success) return;
  await setFormStatus(parsed.data.formId, "paused");
  revalidatePath("/dashboard");
}

export async function resumeFormAction(formData: FormData): Promise<void> {
  const parsed = formIdSchema.safeParse({ formId: formData.get("formId") });
  if (!parsed.success) return;
  await setFormStatus(parsed.data.formId, "draft");
  revalidatePath("/dashboard");
}

export async function archiveFormAction(formData: FormData): Promise<void> {
  const parsed = formIdSchema.safeParse({ formId: formData.get("formId") });
  if (!parsed.success) return;
  await setFormStatus(parsed.data.formId, "archived");
  revalidatePath("/dashboard");
}

export async function deleteFormAction(formData: FormData): Promise<void> {
  const parsed = formIdSchema.safeParse({ formId: formData.get("formId") });
  if (!parsed.success) return;
  await softDeleteForm(parsed.data.formId);
  revalidatePath("/dashboard");
}

const publishFormSchema = z.object({
  formId: z.string().uuid(),
  expectedRevision: z.coerce.number().int(),
});

export interface PublishActionState {
  error?: string;
  success?: boolean;
}

export async function publishFormAction(
  _prevState: PublishActionState,
  formData: FormData,
): Promise<PublishActionState> {
  const parsed = publishFormSchema.safeParse({
    formId: formData.get("formId"),
    expectedRevision: formData.get("expectedRevision"),
  });
  if (!parsed.success) return { error: "Ungültige Eingabe." };

  const user = await getCurrentUser();
  if (!user) return { error: "Nicht angemeldet." };

  try {
    await publishFormRepo(parsed.data.formId, parsed.data.expectedRevision, user.id);
  } catch (error) {
    return {
      error: isAppError(error) ? error.publicMessage : "Formular konnte nicht veröffentlicht werden.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/forms/${parsed.data.formId}`);
  return { success: true };
}

/** Fetches an older version's definition for the version-history diff view (plan §14). */
export async function getFormVersionDefinitionAction(
  versionId: string,
): Promise<import("@/lib/form-schema/schema").FormDefinition | null> {
  const parsed = z.string().uuid().safeParse(versionId);
  if (!parsed.success) return null;
  const version = await getFormVersion(parsed.data);
  return version?.definition ?? null;
}

const restoreVersionSchema = z.object({
  formId: z.string().uuid(),
  versionId: z.string().uuid(),
  expectedRevision: z.coerce.number().int(),
});

export interface RestoreVersionResult {
  error?: string;
  newRevision?: number;
}

/**
 * Restores an older published version's content into the current draft
 * (plan §14 "ältere Version wiederherstellen"). Uses the same
 * optimistic-concurrency `expectedRevision` check as autosave — the caller
 * passes the draft revision it last saw so a restore can't silently clobber
 * a change made in another tab in the meantime.
 */
export async function restoreFormVersionAction(
  formId: string,
  versionId: string,
  expectedRevision: number,
): Promise<RestoreVersionResult> {
  const parsed = restoreVersionSchema.safeParse({ formId, versionId, expectedRevision });
  if (!parsed.success) return { error: "Ungültige Eingabe." };

  try {
    const version = await getFormVersion(parsed.data.versionId);
    if (!version) return { error: "Version nicht gefunden." };

    const result = await restoreFormVersion(
      parsed.data.formId,
      parsed.data.expectedRevision,
      version.definition,
    );
    revalidatePath(`/forms/${parsed.data.formId}`);
    return { newRevision: result.newRevision };
  } catch (error) {
    return {
      error: isAppError(error) ? error.publicMessage : "Version konnte nicht wiederhergestellt werden.",
    };
  }
}
