"use client";

import { LifeBuoy, Mail, Code, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SUPPORT_EMAIL = "kortehenry144@gmail.com";
const REPO_URL = "https://github.com/henrymh5/ai-form-builder";

/**
 * Support entry point in the topbar.
 *
 * This is a portfolio project with no helpdesk behind it, so the pill offers the two
 * channels that actually exist — a direct mail and the public repository — instead of
 * linking to a help centre that would 404.
 */
export function SupportPill() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Support und Kontakt"
        className="border-border text-text-secondary hover:border-border-strong hover:text-text-primary hover:bg-surface-subtle flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors"
      >
        <LifeBuoy className="size-4" />
        <span className="hidden lg:inline">Support</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-64">
        <div className="px-2 py-2">
          <p className="text-text-primary text-sm font-medium">Hilfe & Kontakt</p>
          <p className="text-text-muted mt-0.5 text-xs">
            Persönliches Portfolio-Projekt — keine kommerzielle Supportzusage.
          </p>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("FormCraft — Frage")}`}>
            <Mail className="size-4" />
            E-Mail schreiben
          </a>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            <Code className="size-4" />
            Quellcode auf GitHub
            <ExternalLink className="text-text-muted ml-auto size-3" />
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
