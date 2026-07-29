"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createUserClient } from "@/lib/db/user-client";

const loginSchema = z.object({
  email: z.string().email("Bitte eine gültige E-Mail-Adresse angeben."),
  password: z.string().min(1, "Bitte ein Passwort angeben."),
});

export interface AuthActionState {
  error?: string;
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "E-Mail-Adresse oder Passwort ist falsch." };
  }

  redirect("/dashboard");
}

const registerSchema = z.object({
  displayName: z.string().min(1, "Bitte einen Namen angeben.").max(100),
  email: z.string().email("Bitte eine gültige E-Mail-Adresse angeben."),
  password: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen haben."),
});

export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const supabase = await createUserClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { display_name: parsed.data.displayName } },
  });
  if (error) {
    return {
      error:
        error.message === "User already registered"
          ? "Für diese E-Mail-Adresse existiert bereits ein Konto."
          : "Registrierung fehlgeschlagen. Bitte versuche es erneut.",
    };
  }

  redirect("/dashboard");
}

const resetPasswordSchema = z.object({
  email: z.string().email("Bitte eine gültige E-Mail-Adresse angeben."),
});

export interface ResetPasswordActionState {
  error?: string;
  success?: boolean;
}

export async function requestPasswordResetAction(
  _prevState: ResetPasswordActionState,
  formData: FormData,
): Promise<ResetPasswordActionState> {
  const parsed = resetPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const supabase = await createUserClient();
  // Errors are intentionally not surfaced in detail — avoids leaking whether
  // an email address has an account (plan §14 IDOR/enumeration hygiene).
  await supabase.auth.resetPasswordForEmail(parsed.data.email);

  return { success: true };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  redirect("/login");
}
