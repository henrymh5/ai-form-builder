"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";

async function copy(text: string) {
  await navigator.clipboard.writeText(text);
  toast("In die Zwischenablage kopiert");
}

/**
 * Share dialog (plan §10.2/§12): public link, iframe embed, and script-tag
 * embed code, each with a copy button. Uses `window.location.origin` at
 * render time — the codes are only ever shown client-side after publish.
 */
export function ShareDialog({
  slug,
  open,
  onOpenChange,
}: {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [origin] = useState(() => (typeof window !== "undefined" ? window.location.origin : ""));
  const publicUrl = `${origin}/f/${slug}`;
  const iframeCode = `<iframe src="${origin}/embed/${slug}" width="100%" height="600" style="border:0" loading="lazy" title="Formular"></iframe>`;
  const scriptCode = `<div data-formapp-slug="${slug}"></div>\n<script async src="${origin}/embed.js"></script>`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Teilen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="share-link">Öffentlicher Link</Label>
            <div className="flex gap-2">
              <Input id="share-link" readOnly value={publicUrl} />
              <Button type="button" variant="secondary" onClick={() => copy(publicUrl)}>
                Kopieren
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="share-iframe">Einbetten als iframe</Label>
            <Textarea id="share-iframe" readOnly value={iframeCode} rows={3} />
            <Button type="button" variant="secondary" onClick={() => copy(iframeCode)}>
              Code kopieren
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="share-script">Einbetten per Script</Label>
            <Textarea id="share-script" readOnly value={scriptCode} rows={3} />
            <Button type="button" variant="secondary" onClick={() => copy(scriptCode)}>
              Code kopieren
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
