"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAction, type AuthActionState } from "@/features/workspaces/actions/auth-actions";

const initialState: AuthActionState = {};

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerAction, initialState);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-text-primary text-xl font-semibold">Konto erstellen</h1>
        <p className="text-text-secondary mt-1 text-sm">
          Bei der Registrierung wird automatisch dein persönlicher Workspace angelegt.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="displayName">Name</Label>
          <Input id="displayName" name="displayName" autoComplete="name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-Mail-Adresse</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Passwort</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        {state.error ? (
          <p role="alert" className="text-error text-sm">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" variant="primary" className="w-full" disabled={isPending}>
          {isPending ? "Konto wird erstellt…" : "Konto erstellen"}
        </Button>
      </form>

      <p className="text-text-secondary text-sm">
        Bereits registriert?{" "}
        <Link href="/login" className="text-primary-text hover:text-primary-hover">
          Anmelden
        </Link>
      </p>
    </div>
  );
}
