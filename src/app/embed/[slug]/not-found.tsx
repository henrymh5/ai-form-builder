"use client";

import { useEffect } from "react";

/**
 * Embed 404 (plan §12): sends `form.error` to the host page instead of just
 * rendering — the host script re-dispatches it so integrators can react
 * (e.g. hide the iframe) instead of showing a broken embed silently.
 */
export default function EmbedFormNotFound() {
  useEffect(() => {
    window.parent?.postMessage(
      { source: "formapp", type: "form.error", payload: { code: "NOT_FOUND" } },
      "*",
    );
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="text-text-secondary text-sm">Formular nicht gefunden.</p>
    </div>
  );
}
