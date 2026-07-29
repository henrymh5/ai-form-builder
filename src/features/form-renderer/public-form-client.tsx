"use client";

import { useEffect, useRef, useState } from "react";
import { FormRenderer } from "@/features/form-renderer/form-renderer";
import type { FormDefinition } from "@/lib/form-schema/schema";

function generateIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Retries a fetch with exponential backoff (plan §15 "Wiederaufnahme bei Verbindungsproblemen"). */
async function fetchWithRetry(input: string, init: RequestInit, retries = 3): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(input, init);
      if (response.ok || response.status < 500) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
  throw lastError;
}

/**
 * Client-side chrome around the shared `FormRenderer` for the public route
 * (plan §15): creates the anonymous session on mount, fires page-view
 * events, includes an invisible honeypot field, and submits with a stable
 * per-session idempotency key + retry-with-backoff.
 */
export interface EmbedEvent {
  type: "ready" | "started" | "stepChanged" | "submitted" | "error";
  payload?: Record<string, unknown>;
}

export function PublicFormClient({
  slug,
  definition,
  onEmbedEvent,
}: {
  slug: string;
  definition: FormDefinition;
  /** Embed-only hook (plan §12): forwards renderer lifecycle events to the host page via postMessage. */
  onEmbedEvent?: (event: EmbedEvent) => void;
}) {
  const idempotencyKeyRef = useRef(generateIdempotencyKey());
  const honeypotRef = useRef<HTMLInputElement>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // A promise that EXISTS from the very first render, with its resolve/reject
  // captured for the effect below to call once the session fetch actually
  // settles. This matters because `FormRenderer`'s own mount effect — a
  // child effect — runs BEFORE this component's effect (React fires child
  // effects first), and it calls `onPageView` for the initial page
  // immediately. If the promise were only created inside this component's
  // effect, that first `onPageView` call would have nothing to await and
  // would silently drop the page_view for page 1 every time. Held in
  // `useState` (not a ref) since the linter forbids writing refs reachable
  // from a lazy initializer.
  const [{ promise: sessionPromise, resolve: resolveSession, reject: rejectSession }] = useState(
    () => {
      let resolve!: (id: string) => void;
      let reject!: (error: unknown) => void;
      const promise = new Promise<string>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    },
  );

  useEffect(() => {
    fetchWithRetry(`/api/public/forms/${slug}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referrer: document.referrer || undefined,
        utmSource: new URLSearchParams(window.location.search).get("utm_source") ?? undefined,
        utmMedium: new URLSearchParams(window.location.search).get("utm_medium") ?? undefined,
        utmCampaign: new URLSearchParams(window.location.search).get("utm_campaign") ?? undefined,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        onEmbedEvent?.({ type: "ready" });
        resolveSession(data.sessionId as string);
      })
      .catch((error: unknown) => {
        // Session creation failure degrades gracefully — the form still
        // renders and can be filled; only tracking/submission are affected.
        onEmbedEvent?.({ type: "error", payload: { code: "SESSION_FAILED" } });
        rejectSession(error);
      });
  }, [slug, onEmbedEvent, resolveSession, rejectSession]);

  function onPageView(pageId: string) {
    onEmbedEvent?.({ type: "stepChanged", payload: { pageId } });
    // Awaits the same session-creation promise `onComplete` uses — the
    // initial page_view now fires from FormRenderer's mount effect, which
    // usually runs before the session fetch resolves, so relying on the
    // `sessionId` state directly would silently drop it (the same race
    // fixed for submissions in Phase 13).
    void sessionPromise
      .then((sessionId) =>
        fetch(`/api/public/forms/${slug}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, eventType: "page_view", pageId }),
        }),
      )
      .catch(() => {});
  }

  async function onComplete(answers: Record<string, unknown>) {
    onEmbedEvent?.({ type: "started" });
    setSubmitting(true);
    setSubmitError(null);
    let resolvedSessionId: string;
    try {
      resolvedSessionId = await sessionPromise;
    } catch {
      setSubmitError("Verbindung fehlgeschlagen. Bitte lade die Seite neu.");
      setSubmitting(false);
      onEmbedEvent?.({ type: "error", payload: { code: "SESSION_FAILED" } });
      return;
    }
    try {
      const response = await fetchWithRetry(`/api/public/forms/${slug}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: resolvedSessionId,
          idempotencyKey: idempotencyKeyRef.current,
          answers,
          website: honeypotRef.current?.value || undefined,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setSubmitError(data?.error?.message ?? "Übermittlung fehlgeschlagen.");
        onEmbedEvent?.({ type: "error", payload: { code: "SUBMIT_FAILED" } });
        return;
      }
      setSubmitted(true);
      onEmbedEvent?.({ type: "submitted" });
    } catch {
      setSubmitError("Übermittlung fehlgeschlagen. Bitte versuche es erneut.");
      onEmbedEvent?.({ type: "error", payload: { code: "SUBMIT_FAILED" } });
    } finally {
      setSubmitting(false);
    }
  }

  if (submitError && !submitted) {
    return (
      <div className="mx-auto max-w-lg space-y-3 py-16 text-center">
        <p className="text-error text-sm">{submitError}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Honeypot: hidden from sighted and screen-reader users; bots filling every field will fill this too. */}
      <input
        ref={honeypotRef}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute h-0 w-0 opacity-0"
      />
      <FormRenderer
        definition={definition}
        mode="public"
        onPageView={onPageView}
        onComplete={(answers) => void onComplete(answers)}
      />
      {submitting ? <p className="text-text-muted text-center text-xs">Wird gesendet…</p> : null}
    </div>
  );
}
