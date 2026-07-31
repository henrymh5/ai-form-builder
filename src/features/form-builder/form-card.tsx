"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShareDialog } from "@/features/form-builder/share-dialog";
import { FormStatusBadge } from "@/features/form-builder/form-status-badge";
import { completionRate } from "@/lib/analytics/rates";
import type { FormSummary } from "@/lib/db/repositories/forms";
import {
  archiveFormAction,
  deleteFormAction,
  duplicateFormAction,
  pauseFormAction,
  renameFormAction,
  resumeFormAction,
} from "@/features/form-builder/actions/form-actions";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function conversionRate(form: FormSummary): string {
  const rate = completionRate(form.completionCount, form.startCount);
  return rate === null ? "–" : `${Math.round(rate * 100)}%`;
}

/**
 * Calls a `(formData) => Promise<void>` server action directly instead of
 * via a nested `<form>` inside a Radix DropdownMenuItem — nesting a form
 * there is unreliable because the Item's own select/close handling can
 * intercept the click before the browser submits it. Server actions are
 * plain async functions and can be invoked directly like this from client
 * components.
 */
function runFormIdAction(action: (formData: FormData) => Promise<void>, formId: string): void {
  const formData = new FormData();
  formData.set("formId", formId);
  void action(formData);
}

export function FormCard({ form }: { form: FormSummary }) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <Card className="flex flex-col gap-3" data-testid="form-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/forms/${form.id}`} className="hover:underline">
            <h3 className="text-text-primary truncate text-base font-semibold">{form.title}</h3>
          </Link>
          <FormStatusBadge status={form.status} className="mt-1.5" />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Aktionen">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/forms/${form.id}`}>Öffnen</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/forms/${form.id}/responses`}>Antworten</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/forms/${form.id}/analytics`}>Analytics</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setRenameOpen(true)}>Umbenennen</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => runFormIdAction(duplicateFormAction, form.id)}>
              Duplizieren
            </DropdownMenuItem>
            {form.publishedVersionId ? (
              <DropdownMenuItem asChild>
                <a href={`/f/${form.slug}?preview=1`} target="_blank" rel="noopener noreferrer">
                  Vorschau öffnen
                </a>
              </DropdownMenuItem>
            ) : null}
            {form.publishedVersionId ? (
              <DropdownMenuItem onSelect={() => setShareOpen(true)}>Teilen</DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            {form.status === "paused" ? (
              <DropdownMenuItem onSelect={() => runFormIdAction(resumeFormAction, form.id)}>
                Fortsetzen
              </DropdownMenuItem>
            ) : form.status === "published" ? (
              <DropdownMenuItem onSelect={() => runFormIdAction(pauseFormAction, form.id)}>
                Pausieren
              </DropdownMenuItem>
            ) : null}
            {form.status !== "archived" ? (
              <DropdownMenuItem onSelect={() => runFormIdAction(archiveFormAction, form.id)}>
                Archivieren
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => setDeleteOpen(true)}>
              Löschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <Metric label="Aufrufe" value={form.viewCount} />
        <Metric label="Gestartet" value={form.startCount} />
        <Metric label="Abgeschlossen" value={form.completionCount} />
        <Metric label="Conversion" value={conversionRate(form)} />
      </div>

      <div className="text-text-muted flex justify-between text-xs">
        <span>Bearbeitet: {formatDate(form.updatedAt)}</span>
        {/* The count is the obvious thing to click when you want to read the answers. */}
        <Link
          href={`/forms/${form.id}/responses`}
          className="hover:text-primary-text hover:underline"
        >
          {form.responseCount} Antworten
        </Link>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Formular umbenennen</DialogTitle>
          </DialogHeader>
          <form
            action={async (formData) => {
              await renameFormAction(formData);
              setRenameOpen(false);
            }}
            className="space-y-4"
          >
            <input type="hidden" name="formId" value={form.id} />
            <div className="space-y-1.5">
              <Label htmlFor={`rename-${form.id}`}>Titel</Label>
              <Input id={`rename-${form.id}`} name="title" defaultValue={form.title} required />
            </div>
            <DialogFooter>
              <Button type="submit" variant="primary">
                Speichern
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Formular löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-text-secondary text-sm">
            &quot;{form.title}&quot; wird gelöscht. Diese Aktion kann nicht rückgängig gemacht
            werden.
          </p>
          <DialogFooter>
            <form action={deleteFormAction}>
              <input type="hidden" name="formId" value={form.id} />
              <Button type="submit" variant="destructive">
                Löschen
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ShareDialog slug={form.slug} open={shareOpen} onOpenChange={setShareOpen} />
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-text-primary text-sm font-semibold">{value}</div>
      <div className="text-text-muted text-[11px]">{label}</div>
    </div>
  );
}
