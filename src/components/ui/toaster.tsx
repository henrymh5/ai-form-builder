"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * Toast host — Style-Guide §23.13: toasts are for transient status, never
 * for critical errors that require direct user action (use a banner/dialog).
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "rounded-lg border border-border bg-surface text-text-primary shadow-md",
          description: "text-text-secondary",
        },
      }}
    />
  );
}

export { toast } from "sonner";
