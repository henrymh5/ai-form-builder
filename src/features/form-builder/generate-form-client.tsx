"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GeneratingOverlay } from "@/features/form-builder/generating-overlay";

/** Where the dialog hands the prompt over, so a long description never lands in the URL. */
export const GENERATE_REQUEST_KEY = "formcraft:generate-request";

export interface GenerateRequest {
  workspaceId: string;
  description: string;
}

/** Reads and clears the pending request — one navigation consumes exactly one prompt. */
function takePendingRequest(): GenerateRequest | null {
  try {
    const raw = sessionStorage.getItem(GENERATE_REQUEST_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(GENERATE_REQUEST_KEY);
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as GenerateRequest).workspaceId !== "string" ||
      typeof (parsed as GenerateRequest).description !== "string"
    ) {
      return null;
    }
    return parsed as GenerateRequest;
  } catch {
    return null;
  }
}

/**
 * Drives AI form generation from its own page, so the user leaves the dialog immediately and
 * waits on a dedicated screen instead of a frozen modal. On success it *replaces* this entry
 * in the history stack with the builder — going back from the new form must not re-trigger
 * generation or strand the user on a dead waiting screen.
 */
export function GenerateFormClient() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // Survives the double-invocation of effects under React Strict Mode in development, which
  // would otherwise fire two generations (and bill two Claude calls) per visit.
  const startedRef = useRef(false);
  // Kept so "Erneut versuchen" can resend the same prompt instead of making the user retype it.
  const requestRef = useRef<GenerateRequest | null>(null);

  const generate = useCallback(
    async (request: GenerateRequest) => {
      try {
        const response = await fetch("/api/ai/generate-form", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error?.message ?? "Formular konnte nicht generiert werden.");
          return;
        }
        router.replace(`/forms/${data.formId}`);
      } catch {
        setError("Formular konnte nicht generiert werden.");
      }
    },
    [router],
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const request = takePendingRequest();
    if (!request) {
      // Direct hit on this URL, or a reload after the prompt was consumed.
      router.replace("/forms");
      return;
    }
    requestRef.current = request;
    // `generate` only calls setState after awaiting the fetch, never synchronously in this
    // effect — starting a request and reporting its outcome in the callback is exactly the
    // external-system pattern this rule allows, but its call-graph check can't see that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void generate(request);
  }, [generate, router]);

  const handleRetry = useCallback(() => {
    const request = requestRef.current;
    if (!request) {
      router.replace("/forms");
      return;
    }
    // Clearing here (rather than inside `generate`) keeps the first run free of a
    // synchronous setState in the effect, which would cause a cascading render.
    setError(null);
    void generate(request);
  }, [generate, router]);

  return <GeneratingOverlay error={error ?? undefined} onRetry={handleRetry} />;
}
