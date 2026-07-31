import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/shared/logo";
import { HeaderSearch } from "@/components/shared/header-search";
import { SupportPill } from "@/components/shared/support-pill";
import { UserMenu } from "@/features/workspaces/user-menu";
import type { CurrentUser } from "@/lib/db/repositories/profile";
import type { WorkspaceSummary } from "@/lib/db/repositories/workspaces";

const ROLE_LABEL: Record<WorkspaceSummary["role"], string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
};

interface AppTopbarProps {
  user: CurrentUser;
  workspaces: WorkspaceSummary[];
}

/** App shell topbar — Style-Guide §23.10. */
export function AppTopbar({ user, workspaces }: AppTopbarProps) {
  const currentWorkspace = workspaces[0];

  return (
    <header className="border-border bg-surface flex h-(--layout-header-height) shrink-0 items-center gap-4 border-b px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <Link href="/dashboard" aria-label="Flowdesk — zum Dashboard" className="flex items-center">
          <Logo className="h-9" priority />
        </Link>

        {currentWorkspace ? (
          <>
            <span className="text-border" aria-hidden>
              /
            </span>
            <Link
              href="/workspace"
              aria-label={`Workspace ${currentWorkspace.name} — Einstellungen und Mitglieder`}
              className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1"
            >
              <span className="text-text-secondary hover:text-text-primary truncate text-sm">
                {currentWorkspace.name}
              </span>
              <Badge variant="neutral" className="hidden shrink-0 sm:inline-flex">
                {ROLE_LABEL[currentWorkspace.role]}
              </Badge>
            </Link>
          </>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <HeaderSearch />
        <SupportPill />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
