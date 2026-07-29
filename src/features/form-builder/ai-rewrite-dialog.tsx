"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

type Style = "reword" | "shorten" | "friendlier";

const STYLE_LABEL: Record<Style, string> = {
  reword: "Umformulieren",
  shorten: "Kürzen",
  friendlier: "Freundlicher",
};

/**
 * Contextual AI action (plan §11 "Frage umformulieren/kürzen/freundlicher
 * formulieren") — shows current vs. suggested content with Übernehmen /
 * Verwerfen / Neu generieren, as the plan requires for every AI change.
 */
export function AiRewriteDialog({
  workspaceId,
  formId,
  currentLabel,
  currentDescription,
  onAccept,
}: {
  workspaceId: string;
  formId?: string;
  currentLabel: string;
  currentDescription?: string;
  onAccept: (newLabel: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<Style>("reword");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setIsPending(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/rewrite-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          formId,
          label: currentLabel,
          description: currentDescription,
          style,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error?.message ?? "Vorschlag konnte nicht erstellt werden.");
        return;
      }
      setSuggestion(data.label);
    } catch {
      setError("Vorschlag konnte nicht erstellt werden.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setSuggestion(null);
          setError(null);
        }
      }}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Mit KI umformulieren"
        onClick={() => {
          setOpen(true);
          void generate();
        }}
      >
        <Sparkles className="size-4" />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Frage mit KI überarbeiten</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Select value={style} onValueChange={(v) => setStyle(v as Style)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STYLE_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="space-y-1.5">
            <p className="text-text-muted text-xs font-medium tracking-wide uppercase">
              Bisher
            </p>
            <p className="border-border bg-surface-subtle rounded-md border p-3 text-sm">
              {currentLabel}
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-text-muted text-xs font-medium tracking-wide uppercase">
              Vorschlag
            </p>
            <div className="border-primary/30 bg-primary-subtle/30 min-h-14 rounded-md border p-3 text-sm">
              {isPending ? (
                <Spinner className="size-4" />
              ) : error ? (
                <span className="text-error">{error}</span>
              ) : (
                suggestion
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => void generate()} disabled={isPending}>
            Neu generieren
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!suggestion || isPending}
            onClick={() => {
              if (suggestion) onAccept(suggestion);
              setOpen(false);
            }}
          >
            Übernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
