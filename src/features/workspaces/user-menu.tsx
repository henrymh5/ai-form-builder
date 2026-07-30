"use client";

import Link from "next/link";
import { ChevronDown, LogOut, Settings, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/features/workspaces/actions/auth-actions";
import type { CurrentUser } from "@/lib/db/repositories/profile";

/** Avatar trigger opening account actions and sign-out. */
export function UserMenu({ user }: { user: CurrentUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Konto-Menü für ${user.displayName}`}
        className="hover:bg-surface-subtle flex items-center gap-1.5 rounded-full py-1 pr-2 pl-1 transition-colors"
      >
        <Avatar name={user.displayName} src={user.avatarUrl} />
        <ChevronDown className="text-text-muted size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-56">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <Avatar name={user.displayName} src={user.avatarUrl} size="lg" />
          <div className="min-w-0">
            <div className="text-text-primary truncate text-sm font-medium">{user.displayName}</div>
            {user.email ? (
              <div className="text-text-muted truncate text-xs">{user.email}</div>
            ) : null}
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/workspace">
            <Users className="size-4" />
            Workspace &amp; Mitglieder
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/reset-password">
            <Settings className="size-4" />
            Passwort ändern
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/*
         * Calls the Server Action directly rather than wrapping a <form> in the item: Radix
         * closes the menu on select, which unmounts the form before the submit can fire.
         */}
        <DropdownMenuItem destructive onSelect={() => void logoutAction()}>
          <LogOut className="size-4" />
          Abmelden
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
