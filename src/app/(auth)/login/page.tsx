"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type AuthActionState } from "@/features/workspaces/actions/auth-actions";

const initialState: AuthActionState = {};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-text-primary text-xl font-semibold">Anmelden</h1>
        <p className="text-text-secondary mt-1 text-sm">Willkommen zurück.</p>
      </div>

      <form action={formAction} className="space-y-4">
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
            autoComplete="current-password"
            required
          />
        </div>

        {state.error ? (
          <p role="alert" className="text-error text-sm">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" variant="primary" className="w-full" disabled={isPending}>
          {isPending ? "Anmelden…" : "Anmelden"}
        </Button>
      </form>

      <div className="text-text-secondary flex justify-between text-sm">
        <Link href="/reset-password" className="text-primary-text hover:text-primary-hover">
          Passwort vergessen?
        </Link>
        <Link href="/register" className="text-primary-text hover:text-primary-hover">
          Konto erstellen
        </Link>
      </div>
    </div>
  );
}
