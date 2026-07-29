"use client";

import { useState } from "react";
import { Eye, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { useBuilderStore } from "@/features/form-builder/builder-store";
import { FormRenderer } from "@/features/form-renderer/form-renderer";

type Viewport = "desktop" | "mobile";

/**
 * Builder preview / test mode (plan §13): the exact same `FormRenderer` used
 * publicly, opened in `mode="test"` so the response path is visible and
 * responses are never persisted (plan §13 "Testantworten werden entweder
 * nicht gespeichert oder eindeutig als Test markiert" — here: not
 * persisted at all, since this dialog has no submission backend). Includes
 * a mobile/desktop toggle (plan §13 "mobile Darstellung prüfen").
 */
export function PreviewDialog() {
  const [open, setOpen] = useState(false);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const definition = useBuilderStore((s) => s.definition);

  if (!definition) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Eye className="size-4" />
        Vorschau
      </Button>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Vorschau &amp; Testmodus</DialogTitle>
            <div className="border-border flex items-center gap-0.5 rounded-md border p-0.5">
              <button
                type="button"
                aria-label="Desktop-Ansicht"
                aria-pressed={viewport === "desktop"}
                onClick={() => setViewport("desktop")}
                className={cn(
                  "rounded p-1.5",
                  viewport === "desktop"
                    ? "bg-primary-subtle text-primary-text"
                    : "text-text-muted hover:text-text-primary",
                )}
              >
                <Monitor className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Mobile Ansicht"
                aria-pressed={viewport === "mobile"}
                onClick={() => setViewport("mobile")}
                className={cn(
                  "rounded p-1.5",
                  viewport === "mobile"
                    ? "bg-primary-subtle text-primary-text"
                    : "text-text-muted hover:text-text-primary",
                )}
              >
                <Smartphone className="size-4" />
              </button>
            </div>
          </div>
        </DialogHeader>

        <div
          className={cn(
            "border-border bg-background mx-auto max-h-[70vh] overflow-y-auto rounded-md border p-4",
            viewport === "mobile" ? "w-[375px]" : "w-full",
          )}
        >
          {/* Remounts on open/viewport change so a prior test run's state never leaks into the next. */}
          <FormRenderer key={`${open}-${viewport}`} definition={definition} mode="test" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
