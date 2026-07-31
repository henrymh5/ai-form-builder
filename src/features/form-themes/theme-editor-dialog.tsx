"use client";

import { useState } from "react";
import { Palette, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBuilderStore } from "@/features/form-builder/builder-store";
import { checkThemeAccessibility } from "@/features/form-themes/contrast";
import { ThemePreview } from "@/features/form-themes/theme-preview";
import { FONT_LABEL } from "@/features/form-themes/theme-style";
import { FONT_OPTIONS, type Theme } from "@/lib/form-schema/theme";

/**
 * Theme Editor (plan §10): a small, tokenized set of controls — no free-form
 * CSS, matching the plan's explicit "kein Custom CSS" constraint. Every
 * control writes directly to `definition.theme` via the Builder Store, so
 * changes ride the same undo/redo + autosave pipeline as everything else.
 */
export function ThemeEditorDialog() {
  const [open, setOpen] = useState(false);
  const theme = useBuilderStore((s) => s.definition?.theme);
  const updateTheme = useBuilderStore((s) => s.updateTheme);

  if (!theme) return null;

  const issues = checkThemeAccessibility(theme);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Palette className="size-4" />
        Design
        {issues.length > 0 ? (
          <span className="bg-warning-subtle text-warning rounded-full px-1.5 text-xs font-medium">
            {issues.length}
          </span>
        ) : null}
      </Button>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Design-Editor</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2">
            {issues.length > 0 ? (
              <div className="border-warning/30 bg-warning-subtle space-y-1.5 rounded-md border p-3">
                {issues.map((issue) => (
                  <p key={issue.code} className="text-warning flex items-start gap-1.5 text-sm">
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                    {issue.message}
                  </p>
                ))}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <ColorField
                label="Primärfarbe"
                value={theme.colorPrimary}
                onChange={(v) => updateTheme({ colorPrimary: v })}
              />
              <ColorField
                label="Hintergrundfarbe"
                value={theme.colorBackground}
                onChange={(v) => updateTheme({ colorBackground: v })}
              />
              <ColorField
                label="Textfarbe"
                value={theme.colorText}
                onChange={(v) => updateTheme({ colorText: v })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="font-family">Schriftart</Label>
              <Select
                value={theme.fontFamily}
                onValueChange={(v) => updateTheme({ fontFamily: v as Theme["fontFamily"] })}
              >
                <SelectTrigger id="font-family">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* Driven by the schema enum so picker and renderer can't drift apart. */}
                  {FONT_OPTIONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {FONT_LABEL[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="font-size">Schriftgröße ({theme.fontSizeBase}px)</Label>
              <input
                id="font-size"
                type="range"
                min={14}
                max={20}
                value={theme.fontSizeBase}
                onChange={(e) => updateTheme({ fontSizeBase: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="container-width">Container-Breite ({theme.containerWidth}px)</Label>
              <input
                id="container-width"
                type="range"
                min={480}
                max={960}
                step={20}
                value={theme.containerWidth}
                onChange={(e) => updateTheme({ containerWidth: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="spacing">Abstände</Label>
              <Select
                value={theme.spacing}
                onValueChange={(v) =>
                  updateTheme({ spacing: v as "compact" | "comfortable" | "spacious" })
                }
              >
                <SelectTrigger id="spacing">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Kompakt</SelectItem>
                  <SelectItem value="comfortable">Angenehm</SelectItem>
                  <SelectItem value="spacious">Großzügig</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="border-radius">Eckenradius ({theme.borderRadius}px)</Label>
              <input
                id="border-radius"
                type="range"
                min={0}
                max={24}
                value={theme.borderRadius}
                onChange={(e) => updateTheme({ borderRadius: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="button-style">Button-Stil</Label>
                <Select
                  value={theme.buttonStyle}
                  onValueChange={(v) => updateTheme({ buttonStyle: v as "solid" | "outline" })}
                >
                  <SelectTrigger id="button-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solide</SelectItem>
                    <SelectItem value="outline">Umrandet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="input-style">Feld-Stil</Label>
                <Select
                  value={theme.inputStyle}
                  onValueChange={(v) => updateTheme({ inputStyle: v as "outline" | "filled" })}
                >
                  <SelectTrigger id="input-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outline">Umrandet</SelectItem>
                    <SelectItem value="filled">Gefüllt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="border-border bg-background rounded-md border p-4">
            <p className="text-text-muted mb-2 text-xs font-medium tracking-wide uppercase">
              Live-Vorschau
            </p>
            <ThemePreview theme={theme} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border-border h-9 w-9 shrink-0 rounded border p-0.5"
          aria-label={label}
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1" />
      </div>
    </div>
  );
}
