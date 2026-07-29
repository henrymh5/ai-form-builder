"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

/**
 * Short lines shown while Claude generates the form. They describe the actual pipeline
 * (plan §11: generate → validate → build) rather than pretending to report live progress,
 * since the request gives us no intermediate signal to report.
 */
const MESSAGES = [
  "Deine Beschreibung wird gelesen …",
  "Passende Fragen werden ausgewählt …",
  "Die richtigen Feldtypen werden zugeordnet …",
  "Fragen werden auf Seiten verteilt …",
  "Validierungsregeln werden gesetzt …",
  "Bedingungen und Verzweigungen werden geprüft …",
  "Die Abschlussseite wird ergänzt …",
  "Letzter Feinschliff am Entwurf …",
];

const MESSAGE_INTERVAL_MS = 2600;

/** Full-screen waiting state for AI form generation. */
export function GeneratingOverlay({ error, onRetry }: { error?: string; onRetry?: () => void }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (error) return;
    const timer = setInterval(() => {
      // Stops on the last line rather than looping — a repeating list makes a long
      // wait feel stuck, whereas holding the final message reads as "almost done".
      setIndex((current) => Math.min(current + 1, MESSAGES.length - 1));
    }, MESSAGE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [error]);

  if (error) {
    return (
      <Shell>
        <h1 className="text-text-primary text-xl font-semibold">
          Formular konnte nicht generiert werden
        </h1>
        <p role="alert" className="text-text-secondary max-w-md text-sm">
          {error}
        </p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="text-primary-text hover:text-primary-hover text-sm font-medium"
          >
            Erneut versuchen
          </button>
        ) : null}
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="bg-primary-subtle flex size-14 items-center justify-center rounded-full">
        <Sparkles className="text-primary-text size-6 motion-safe:animate-pulse" />
      </div>

      <h1 className="text-text-primary text-xl font-semibold">Dein Formular entsteht</h1>

      {/*
       * `aria-live="polite"` announces each new line to screen readers; the fixed height
       * keeps the surrounding layout from shifting as lines of different length swap in.
       */}
      <p
        aria-live="polite"
        className="text-text-secondary flex h-6 items-center justify-center text-sm"
      >
        {MESSAGES[index]}
      </p>

      <div className="bg-surface-subtle h-1 w-56 overflow-hidden rounded-full">
        <div className="bg-primary h-full animate-[builder-indeterminate_1.8s_ease-in-out_infinite] rounded-full" />
      </div>

      <p className="text-text-muted max-w-sm text-xs">
        Das dauert meist 10–30 Sekunden. Die Seite öffnet sich automatisch, sobald der Entwurf
        bereitsteht.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
      {children}
    </div>
  );
}
