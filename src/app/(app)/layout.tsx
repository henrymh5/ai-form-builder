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
    <div className="flex min-h-screen flex-col">
      <AppTopbar user={user} workspaces={workspaces} />
      <div className="flex flex-1">
        <AppNavigation />
        <main className="bg-background min-w-0 flex-1">
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
