"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useBuilderStore } from "@/features/form-builder/builder-store";

const PROGRESS_LABEL = {
  none: "Keine Anzeige",
  bar: "Fortschrittsbalken",
  percent: "Prozentanzeige",
  steps: "„Schritt X von Y“",
} as const;

/** Form-level settings dialog (plan §7 progress display, §7 Zurück-Button). */
export function FormSettingsDialog() {
  const [open, setOpen] = useState(false);
  const settings = useBuilderStore((s) => s.definition?.settings);
  const updateSettings = useBuilderStore((s) => s.updateSettings);

  if (!settings) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Settings2 className="size-4" />
        Einstellungen
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Formular-Einstellungen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="progress-display">Fortschrittsanzeige</Label>
            <Select
              value={settings.progressDisplay}
              onValueChange={(value) =>
                updateSettings({ progressDisplay: value as typeof settings.progressDisplay })
              }
            >
              <SelectTrigger id="progress-display">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROGRESS_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="allow-back">Zurück-Button erlauben</Label>
            <Switch
              id="allow-back"
              checked={settings.allowBack}
              onCheckedChange={(checked) => updateSettings({ allowBack: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="allow-multiple">Mehrfache Übermittlung erlauben</Label>
            <Switch
              id="allow-multiple"
              checked={settings.allowMultipleSubmissions}
              onCheckedChange={(checked) =>
                updateSettings({ allowMultipleSubmissions: checked })
              }
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
