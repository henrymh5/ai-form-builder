"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  deleteResponse,
  markResponseRead,
  setResponseNote,
  setResponseStatus,
} from "@/lib/db/repositories/responses";

const responseIdSchema = z.object({ responseId: z.string().uuid(), formId: z.string().uuid() });

export async function markResponseReadAction(formData: FormData): Promise<void> {
  const parsed = responseIdSchema.safeParse({
    responseId: formData.get("responseId"),
    formId: formData.get("formId"),
  });
  if (!parsed.success) return;
  await markResponseRead(parsed.data.responseId);
  revalidatePath(`/forms/${parsed.data.formId}/responses`);
}

export async function archiveResponseAction(formData: FormData): Promise<void> {
  const parsed = responseIdSchema.safeParse({
    responseId: formData.get("responseId"),
    formId: formData.get("formId"),
  });
  if (!parsed.success) return;
  await setResponseStatus(parsed.data.responseId, "archived");
  revalidatePath(`/forms/${parsed.data.formId}/responses`);
}

export async function unarchiveResponseAction(formData: FormData): Promise<void> {
  const parsed = responseIdSchema.safeParse({
    responseId: formData.get("responseId"),
    formId: formData.get("formId"),
  });
  if (!parsed.success) return;
  await setResponseStatus(parsed.data.responseId, "completed");
  revalidatePath(`/forms/${parsed.data.formId}/responses`);
}

export async function deleteResponseAction(formData: FormData): Promise<void> {
  const parsed = responseIdSchema.safeParse({
    responseId: formData.get("responseId"),
    formId: formData.get("formId"),
  });
  if (!parsed.success) return;
  await deleteResponse(parsed.data.responseId);
  revalidatePath(`/forms/${parsed.data.formId}/responses`);
}

const noteSchema = z.object({
  responseId: z.string().uuid(),
  formId: z.string().uuid(),
  note: z.string().max(2000),
});

export async function setResponseNoteAction(formData: FormData): Promise<void> {
  const parsed = noteSchema.safeParse({
    responseId: formData.get("responseId"),
    formId: formData.get("formId"),
    note: formData.get("note"),
  });
  if (!parsed.success) return;
  await setResponseNote(parsed.data.responseId, parsed.data.note);
  revalidatePath(`/forms/${parsed.data.formId}/responses`);
  revalidatePath(`/forms/${parsed.data.formId}/responses/${parsed.data.responseId}`);
}
