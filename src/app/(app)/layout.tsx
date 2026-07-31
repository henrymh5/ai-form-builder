import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/shared/app-navigation";
import { AppTopbar } from "@/components/shared/app-topbar";
import { getCurrentUser } from "@/lib/db/repositories/profile";
import { listMyWorkspaces } from "@/lib/db/repositories/workspaces";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const workspaces = await listMyWorkspaces();

  return (
    // `h-screen` (not `min-h-screen`) + `overflow-hidden` pins the shell to
    // the viewport so the topbar and sidebar never scroll away — only
    // `main` below scrolls when its content overflows. `min-h-0` on the row
    // is required for that: without it, a flex child's default
    // `min-height: auto` lets it grow past the row instead of scrolling.
    <div className="flex h-screen flex-col overflow-hidden">
      <AppTopbar user={user} workspaces={workspaces} />
      <div className="flex min-h-0 flex-1">
        <AppNavigation />
        <main className="bg-background min-w-0 flex-1 overflow-y-auto">
          {/*
           * Content is centred and clamped by default. Full-bleed pages (the builder) opt out
           * by setting `data-full-bleed` on their root element, which drops the clamp and the
           * padding without resorting to negative margins that can't undo a max-width.
           */}
          <div className="mx-auto max-w-(--layout-content-max) p-8 has-data-[full-bleed]:max-w-none has-data-[full-bleed]:p-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
