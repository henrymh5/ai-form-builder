"use client";

import { useActionState } from "react";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBuilderStore } from "@/features/form-builder/builder-store";
import {
  publishFormAction,
  type PublishActionState,
} from "@/features/form-builder/actions/form-actions";
import type { AutosaveStatus } from "@/features/form-builder/use-autosave";

const initialState: PublishActionState = {};

/**
 * Publish button (plan §14 "Entwurf und Veröffentlichung trennen"). Disabled
 * while autosave is still writing — `publishForm` reads the draft straight
 * from the database, so publishing mid-save would snapshot a stale draft
 * (e.g. a field just added but not yet persisted).
 */
export function PublishButton({
  formId,
  draftRevision,
  autosaveStatus,
}: {
  formId: string;
  draftRevision: number;
  autosaveStatus: AutosaveStatus;
}) {
  const [state, formAction, isPending] = useActionState(publishFormAction, initialState);
  const definition = useBuilderStore((s) => s.definition);
  const isSaving = autosaveStatus === "saving";

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="formId" value={formId} />
      <input type="hidden" name="expectedRevision" value={draftRevision} />
      {state.error ? <span className="text-error text-xs">{state.error}</span> : null}
      {state.success ? <span className="text-success text-xs">Veröffentlicht!</span> : null}
      <Button
        type="submit"
        variant="primary"
        size="sm"
        disabled={isPending || isSaving || !definition}
        title={isSaving ? "Warte, bis der Entwurf gespeichert ist…" : undefined}
      >
        <Rocket className="size-4" />
        {isPending ? "Wird veröffentlicht…" : isSaving ? "Speichert …" : "Veröffentlichen"}
      </Button>
    </form>
  );
}
