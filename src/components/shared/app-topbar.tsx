import { logoutAction } from "@/features/workspaces/actions/auth-actions";
import { Button } from "@/components/ui/button";
import type { CurrentUser } from "@/lib/db/repositories/profile";
import type { WorkspaceSummary } from "@/lib/db/repositories/workspaces";

interface AppTopbarProps {
  user: CurrentUser;
  workspaces: WorkspaceSummary[];
}

/** App shell topbar — Style-Guide §23.10. */
export function AppTopbar({ user, workspaces }: AppTopbarProps) {
  const currentWorkspace = workspaces[0];

  return (
    <header className="border-border bg-surface flex h-(--layout-header-height) shrink-0 items-center justify-between border-b px-6">
      <div className="flex items-center gap-3">
        <span className="text-text-primary text-sm font-semibold">Form Creator</span>
        {currentWorkspace ? (
          <>
            <span className="text-text-muted">/</span>
            <span className="text-text-secondary text-sm">{currentWorkspace.name}</span>
          </>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-text-secondary text-sm">{user.displayName}</span>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm">
            Abmelden
          </Button>
        </form>
      </div>
    </header>
  );
}
