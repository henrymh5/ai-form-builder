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
        <main className="bg-background flex-1">
          <div className="mx-auto max-w-(--layout-content-max) p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
