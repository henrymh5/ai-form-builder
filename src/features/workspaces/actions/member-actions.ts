"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { findUserIdByEmail } from "@/lib/db/repositories/find-user-by-email";
import {
  addWorkspaceMember,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
} from "@/lib/db/repositories/workspaces";
import { AppError, isAppError } from "@/lib/errors";

export interface MemberActionState {
  error?: string;
  success?: boolean;
}

const addMemberSchema = z.object({
  workspaceId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["editor", "viewer"]),
});

/**
 * [A2]: V1 only supports adding members by email of an ALREADY EXISTING
 * account (looked up via profiles/auth, not created). A full invite flow
 * (email to non-existing accounts) is P2 (plan §19).
 */
export async function addMemberAction(
  _prevState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const parsed = addMemberSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: "Ungültige Eingabe." };
  }

  try {
    const userId = await findUserIdByEmail(parsed.data.email);
    if (!userId) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Für diese E-Mail-Adresse existiert noch kein Konto. Es können aktuell nur bereits registrierte Personen hinzugefügt werden.",
      );
    }
    await addWorkspaceMember(parsed.data.workspaceId, userId, parsed.data.role);
    return { success: true };
  } catch (error) {
    if (isAppError(error)) {
      return { error: error.publicMessage };
    }
    return { error: "Mitglied konnte nicht hinzugefügt werden." };
  } finally {
    revalidatePath("/workspace");
  }
}

const updateRoleSchema = z.object({
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["owner", "editor", "viewer"]),
});

export async function updateMemberRoleAction(formData: FormData): Promise<void> {
  const parsed = updateRoleSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return;

  await updateWorkspaceMemberRole(parsed.data.workspaceId, parsed.data.userId, parsed.data.role);
  revalidatePath("/workspace");
}

const removeMemberSchema = z.object({
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
});

export async function removeMemberAction(formData: FormData): Promise<void> {
  const parsed = removeMemberSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    userId: formData.get("userId"),
  });
  if (!parsed.success) return;

  await removeWorkspaceMember(parsed.data.workspaceId, parsed.data.userId);
  revalidatePath("/workspace");
}
