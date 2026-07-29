"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  requestPasswordResetAction,
  type ResetPasswordActionState,
} from "@/features/workspaces/actions/auth-actions";

const initialState: ResetPasswordActionState = {};

export default function ResetPasswordPage() {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, initialState);

  if (state.success) {
    return (
      <div className="space-y-4">
        <h1 className="text-text-primary text-xl font-semibold">E-Mail unterwegs</h1>
        <p className="text-text-secondary text-sm">
          Falls ein Konto mit dieser E-Mail-Adresse existiert, haben wir dir einen Link zum
          Zurücksetzen des Passworts gesendet.
        </p>
        <Link href="/login" className="text-primary-text hover:text-primary-hover text-sm">
          Zurück zur Anmeldung
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-text-primary text-xl font-semibold">Passwort zurücksetzen</h1>
        <p className="text-text-secondary mt-1 text-sm">
          Gib deine E-Mail-Adresse ein, wir senden dir einen Link.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-Mail-Adresse</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>

        {state.error ? (
          <p role="alert" className="text-error text-sm">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" variant="primary" className="w-full" disabled={isPending}>
          {isPending ? "Wird gesendet…" : "Link senden"}
        </Button>
      </form>

      <Link href="/login" className="text-primary-text hover:text-primary-hover text-sm">
        Zurück zur Anmeldung
      </Link>
    </div>
  );
}
