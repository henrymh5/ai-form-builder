"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import {
  createBlankFormAction,
  type FormActionState,
} from "@/features/form-builder/actions/form-actions";
import {
  GENERATE_REQUEST_KEY,
  type GenerateRequest,
} from "@/features/form-builder/generate-form-client";

const initialState: FormActionState = {};

type Mode = "blank" | "ai";

/**
 * Form creation entry point (plan §3 Schritt 2): "leeres Formular" or
 * "mit KI erstellen" (plan §11). The AI tab calls the /api/ai/generate-form
 * Route Handler directly (not a Server Action) — per plan §11's flow,
 * generation goes through a Route Handler that does auth + rate-limit
 * checks before ever calling Claude.
 */
export function CreateFormDialog({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("blank");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Neues Formular
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neues Formular</DialogTitle>
        </DialogHeader>

        <div className="border-border mb-4 flex gap-1 border-b">
          <TabButton active={mode === "blank"} onClick={() => setMode("blank")}>
            Leeres Formular
          </TabButton>
          <TabButton active={mode === "ai"} onClick={() => setMode("ai")}>
            <Sparkles className="size-3.5" />
            Mit KI erstellen
          </TabButton>
        </div>

        {mode === "blank" ? (
          <BlankFormTab workspaceId={workspaceId} />
        ) : (
          <AiFormTab workspaceId={workspaceId} onClose={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium",
        active
          ? "border-primary text-primary-text"
          : "text-text-secondary hover:text-text-primary border-transparent",
      )}
    >
      {children}
    </button>
  );
}

function BlankFormTab({ workspaceId }: { workspaceId: string }) {
  const [state, formAction, isPending] = useActionState(createBlankFormAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="space-y-1.5">
        <Label htmlFor="new-form-title">Titel</Label>
        <Input id="new-form-title" name="title" placeholder="z. B. Kontaktformular" required />
      </div>
      {state.error ? (
        <p role="alert" className="text-error text-sm">
          {state.error}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Wird erstellt…" : "Formular erstellen"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function AiFormTab({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [isPending, setIsPending] = useState(false);

  /**
   * Hands the prompt to the waiting page and navigates there right away. Generation takes
   * 10–30s, so the request itself is issued by that page — leaving the user staring at a
   * frozen dialog for that long is the problem this replaces.
   */
  function handleGenerate() {
    setIsPending(true);
    const request: GenerateRequest = { workspaceId, description: description.trim() };
    sessionStorage.setItem(GENERATE_REQUEST_KEY, JSON.stringify(request));
    onClose();
    router.push("/forms/generate");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="ai-description">Beschreibe dein Formular</Label>
        <Textarea
          id="ai-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="z. B. Ein Anfrageformular für eine Webagentur mit Budget, gewünschter Leistung und Kontaktdaten."
          rows={5}
          minLength={10}
          maxLength={2000}
        />
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="primary"
          onClick={handleGenerate}
          disabled={isPending || description.trim().length < 10}
        >
          {isPending ? "Wird geöffnet…" : "Formular generieren"}
        </Button>
      </DialogFooter>
    </div>
  );
}
