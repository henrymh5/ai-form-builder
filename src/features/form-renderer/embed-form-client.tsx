"use client";

import { useEffect, useRef } from "react";
import { PublicFormClient, type EmbedEvent } from "@/features/form-renderer/public-form-client";
import type { FormDefinition } from "@/lib/form-schema/schema";

const EVENT_TYPE_MAP: Record<EmbedEvent["type"], string> = {
  ready: "form.ready",
  started: "form.started",
  stepChanged: "form.stepChanged",
  submitted: "form.submitted",
  error: "form.error",
};

/**
 * Embed wrapper around the shared public-form client (plan §12): relays
 * renderer lifecycle events to the host page via postMessage and reports
 * height changes so the host's iframe can auto-resize. Never sends
 * response content — only lifecycle signals (`type`, non-sensitive payload).
 */
export function EmbedFormClient({
  slug,
  definition,
}: {
  slug: string;
  definition: FormDefinition;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  function postToParent(message: Record<string, unknown>) {
    window.parent?.postMessage({ source: "formapp", ...message }, "*");
  }

  function onEmbedEvent(event: EmbedEvent) {
    postToParent({ type: EVENT_TYPE_MAP[event.type], payload: event.payload ?? {} });
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height;
      if (height) postToParent({ type: "form.resized", payload: { height } });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef}>
      <PublicFormClient slug={slug} definition={definition} onEmbedEvent={onEmbedEvent} />
    </div>
  );
}
