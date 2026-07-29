"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { LayoutDashboard, FileText, Users } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/forms", label: "Formulare", icon: FileText },
  { href: "/workspace", label: "Workspace", icon: Users },
] as const;

/** Matches the builder route (`/forms/<id>`) but not its sub-pages (responses, analytics). */
const BUILDER_ROUTE = /^\/forms\/[^/]+$/;

/** Compact sidebar navigation — Style-Guide §23.10/§23.5. */
export function AppNavigation() {
  const pathname = usePathname();

  // The builder is a full-width workspace (plan §23.9) — it owns its own back link instead.
  if (BUILDER_ROUTE.test(pathname)) return null;

  return (
    <nav className="border-border bg-surface flex w-(--layout-sidebar-width) shrink-0 flex-col gap-1 border-r p-3">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium",
              isActive
                ? "bg-primary-subtle text-primary-text"
                : "text-text-secondary hover:bg-surface-subtle hover:text-text-primary",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
