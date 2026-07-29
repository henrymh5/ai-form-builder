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
import { Spinner } from "@/components/ui/spinner";

/** Contextual AI action (plan §11 "Antwortoptionen vorschlagen"). */
export function AiGenerateOptionsButton({
  workspaceId,
  formId,
  label,
  onAccept,
}: {
  workspaceId: string;
  formId?: string;
  label: string;
  onAccept: (options: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [suggestion, setSuggestion] = useState<string[] | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setIsPending(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/generate-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, formId, label, count: 5 }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error?.message ?? "Optionen konnten nicht erstellt werden.");
        return;
      }
      setSuggestion(data.options);
    } catch {
      setError("Optionen konnten nicht erstellt werden.");
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
        aria-label="Optionen mit KI vorschlagen"
        onClick={() => {
          setOpen(true);
          void generate();
        }}
      >
        <Sparkles className="size-4" />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Antwortoptionen vorschlagen</DialogTitle>
        </DialogHeader>

        <div className="border-primary/30 bg-primary-subtle/30 min-h-14 space-y-1 rounded-md border p-3 text-sm">
          {isPending ? (
            <Spinner className="size-4" />
          ) : error ? (
            <span className="text-error">{error}</span>
          ) : suggestion ? (
            <ul className="list-disc space-y-0.5 pl-4">
              {suggestion.map((option, i) => (
                <li key={i}>{option}</li>
              ))}
            </ul>
          ) : null}
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
