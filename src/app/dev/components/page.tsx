"use client";

/**
 * Internal component demo route (Ticket 0.4 DoD: "Demo-Route; axe clean").
 * Not part of the product surface.
 */

import { useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { Trash2 } from "lucide-react";

export default function ComponentsDemoPage() {
  const [checked, setChecked] = useState(false);
  const [radioValue, setRadioValue] = useState("a");

  return (
    <div className="mx-auto max-w-(--layout-content-max) space-y-12 p-8">
      <header>
        <h1 className="text-text-primary text-2xl font-semibold">Komponentenbibliothek</h1>
        <p className="text-text-secondary mt-1 text-sm">
          Interne Referenzansicht der Basis-UI-Komponenten (Runde 1) aus Masterplan §23.12/§23.23.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-text-primary text-xl font-semibold">Buttons</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Formular erstellen</Button>
          <Button variant="secondary">Vorschau</Button>
          <Button variant="ghost">Abbrechen</Button>
          <Button variant="destructive">Löschen</Button>
          <Button disabled>Deaktiviert</Button>
          <IconButton aria-label="Element löschen">
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-text-primary text-xl font-semibold">Formularelemente</h2>
        <Card className="max-w-md space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="demo-input">E-Mail</Label>
            <Input id="demo-input" placeholder="max@beispiel.de" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="demo-input-error">Fehlerzustand</Label>
            <Input id="demo-input-error" invalid defaultValue="ungültig" />
            <p className="text-error text-xs">Bitte eine gültige E-Mail-Adresse angeben.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="demo-textarea">Beschreibung</Label>
            <Textarea id="demo-textarea" placeholder="Kurze Beschreibung…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="demo-select">Feldtyp</Label>
            <Select defaultValue="short_text">
              <SelectTrigger id="demo-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short_text">Kurzer Text</SelectItem>
                <SelectItem value="email">E-Mail</SelectItem>
                <SelectItem value="number">Zahl</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="demo-checkbox"
              checked={checked}
              onCheckedChange={(value) => setChecked(value === true)}
            />
            <Label htmlFor="demo-checkbox">Pflichtfeld</Label>
          </div>
          <RadioGroup value={radioValue} onValueChange={setRadioValue} className="space-y-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="a" id="demo-radio-a" />
              <Label htmlFor="demo-radio-a">Option A</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="b" id="demo-radio-b" />
              <Label htmlFor="demo-radio-b">Option B</Label>
            </div>
          </RadioGroup>
          <div className="flex items-center gap-2">
            <Switch id="demo-switch" />
            <Label htmlFor="demo-switch">Fortschrittsanzeige</Label>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-text-primary text-xl font-semibold">Status-Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral">Entwurf</Badge>
          <Badge variant="success">Veröffentlicht</Badge>
          <Badge variant="warning">Pausiert</Badge>
          <Badge variant="neutral">Archiviert</Badge>
          <Badge variant="info">Testantwort</Badge>
          <Badge variant="error">Spam</Badge>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-text-primary text-xl font-semibold">Karten, Tooltip, Dialog</h2>
        <div className="flex flex-wrap items-start gap-4">
          <Card className="max-w-xs">
            <CardTitle>Projektanfrage</CardTitle>
            <CardDescription>128 Antworten · 34 % Conversion</CardDescription>
          </Card>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary">Mit Tooltip</Button>
            </TooltipTrigger>
            <TooltipContent>Zusätzliche Information</TooltipContent>
          </Tooltip>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive">Formular löschen</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Formular löschen?</DialogTitle>
                <DialogDescription>
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="secondary">Abbrechen</Button>
                <Button variant="destructive">Endgültig löschen</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="secondary" onClick={() => toast("Gespeichert")}>
            Toast auslösen
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-text-primary text-xl font-semibold">Ladezustände</h2>
        <div className="flex items-center gap-6">
          <Spinner className="text-primary" />
          <div className="w-48 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </section>
    </div>
  );
}
