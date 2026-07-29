"use client";

import { useEffect, useRef, useState } from "react";
import { useBuilderStore } from "@/features/form-builder/builder-store";
import { saveDraftAction } from "@/features/form-builder/actions/form-actions";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 1000;

/**
 * Debounced autosave (plan §6): local state updates immediately via the
 * Builder Store (already synchronous); this hook only debounces the
 * *persistence* call. Revision-based optimistic concurrency means a stale
 * save is rejected rather than silently overwriting a newer one saved from
 * another tab — surfaced here as the "error" status with a retry action.
 */
export function useAutosave(formId: string, initialRevision: number) {
  const definition = useBuilderStore((s) => s.definition);
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [revision, setRevision] = useState(initialRevision);
  const revisionRef = useRef(initialRevision);
  const savedDefinitionRef = useRef(definition);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingRef = useRef(false);

  async function save() {
    const current = useBuilderStore.getState().definition;
    if (!current || current === savedDefinitionRef.current) return;

    setStatus("saving");
    try {
      const result = await saveDraftAction(formId, revisionRef.current, current);
      revisionRef.current = result.newRevision;
      savedDefinitionRef.current = current;
      setStatus("saved");
      setRevision(result.newRevision);
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    if (!definition || definition === savedDefinitionRef.current) return;

    // Flips away from "saved" the instant a change is detected, not only
    // once the debounce timer fires `save()` ~`DEBOUNCE_MS` later. Without
    // this, "Gespeichert" stays on screen for the whole debounce window
    // after every edit — indistinguishable from a genuinely completed save
    // of THIS edit, which is misleading in the UI and made this exact
    // status text unusable as a "did this specific edit's autosave land
    // yet?" signal (bit an E2E test that read it as such).
    setStatus("saving");
    pendingRef.current = true;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      pendingRef.current = false;
      void save();
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition]);

  // Flush a pending save on unmount (e.g. navigating away right after a change).
  useEffect(() => {
    return () => {
      if (pendingRef.current) void save();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Exposed so version-restore (a mutation outside this hook's own save path) can sync the tracked revision. */
  function syncRevision(newRevision: number) {
    revisionRef.current = newRevision;
    savedDefinitionRef.current = useBuilderStore.getState().definition;
    setRevision(newRevision);
  }

  return { status, retry: save, revision, syncRevision };
}
