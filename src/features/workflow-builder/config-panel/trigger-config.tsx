"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import type { TriggerConfig, TriggerEvent } from "@/lib/workflow-schema/nodes";
import type { WorkflowFormRef } from "@/lib/workflow-schema/validate";

const TRIGGER_TYPE_LABEL: Record<TriggerEvent, string> = {
  response_submitted: "Neue Formularantwort",
  schedule: "Zeitplan (wiederkehrend)",
  scheduled_once: "Einmalig zu Datum/Uhrzeit",
  webhook_inbound: "Eingehender Webhook",
  manual: "Manuell",
};

const WEEKDAY_OPTIONS: { value: string; label: string }[] = [
  { value: "1", label: "Montag" },
  { value: "2", label: "Dienstag" },
  { value: "3", label: "Mittwoch" },
  { value: "4", label: "Donnerstag" },
  { value: "5", label: "Freitag" },
  { value: "6", label: "Samstag" },
  { value: "7", label: "Sonntag" },
];

/** A sensible default runAt (one hour from now, seconds zeroed) for a freshly switched-to scheduled_once trigger. */
function defaultRunAt(): string {
  const inOneHour = new Date(Date.now() + 60 * 60 * 1000);
  inOneHour.setUTCSeconds(0, 0);
  return inOneHour.toISOString();
}

function freshConfigForEvent(event: TriggerEvent, formIds: string[]): TriggerConfig {
  switch (event) {
    case "response_submitted":
      return { event, formIds };
    case "schedule":
      return { event, frequency: "daily", time: "08:00", formIds };
    case "scheduled_once":
      return { event, runAt: defaultRunAt(), formIds };
    case "webhook_inbound":
      return { event, formIds };
    case "manual":
      return { event, formIds };
  }
}

/** "2026-08-01T14:00:00.000Z" -> "2026-08-01T14:00" (v1 is UTC-only, so this is a direct slice, no timezone conversion). */
function toDatetimeLocalValue(iso: string): string {
  return Number.isNaN(new Date(iso).getTime()) ? "" : iso.slice(0, 16);
}

/** "2026-08-01T14:00" (as typed, treated as UTC wall-clock) -> "2026-08-01T14:00:00.000Z". */
function fromDatetimeLocalValue(value: string): string {
  return `${value}:00.000Z`;
}

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
  toast("In die Zwischenablage kopiert");
}

/**
 * Trigger config panel — a type selector on top (0015: triggers are no
 * longer response-only) plus per-type fields, and a form multi-select whose
 * meaning depends on the type: for `response_submitted` it's WHICH
 * submissions fire the workflow; for every other type it's the digest scope
 * (which forms' new responses feed the run). Switching type preserves the
 * currently selected forms — a user picking "Zeitplan" after "Neue
 * Formularantwort" almost always wants the same forms' data, just batched.
 */
export function TriggerConfigForm({
  config,
  forms,
  inboundToken,
  onChange,
}: {
  config: TriggerConfig;
  forms: WorkflowFormRef[];
  inboundToken: string | null;
  onChange: (config: TriggerConfig) => void;
}) {
  const [origin] = useState(() => (typeof window !== "undefined" ? window.location.origin : ""));
  const formOptions = forms.map((f) => ({ value: f.id, label: f.title }));
  const formsOptional = config.event === "webhook_inbound" || config.event === "manual";

  function handleTypeChange(event: TriggerEvent) {
    if (event === config.event) return;
    onChange(freshConfigForEvent(event, config.formIds));
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Trigger-Typ</Label>
        <Select
          value={config.event}
          onValueChange={(value) => handleTypeChange(value as TriggerEvent)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(TRIGGER_TYPE_LABEL) as [TriggerEvent, string][]).map(
              ([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>

      <p className="text-text-secondary text-sm">
        {config.event === "response_submitted"
          ? "Wird ausgelöst, sobald eine neue Antwort für eines der ausgewählten Formulare eingeht."
          : config.event === "schedule"
            ? "Läuft wiederkehrend zur eingestellten Uhrzeit mit den seit dem letzten Lauf eingegangenen Antworten."
            : config.event === "scheduled_once"
              ? "Läuft genau einmal zum eingestellten Zeitpunkt und pausiert sich danach automatisch."
              : config.event === "webhook_inbound"
                ? "Läuft, sobald die unten stehende URL per POST aufgerufen wird."
                : "Läuft nur, wenn du ihn im Editor oder auf der Workflow-Karte manuell startest."}
      </p>

      {config.event === "schedule" ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Häufigkeit</Label>
            <Select
              value={config.frequency}
              onValueChange={(value) =>
                onChange({ ...config, frequency: value as typeof config.frequency })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Täglich</SelectItem>
                <SelectItem value="weekly">Wöchentlich</SelectItem>
                <SelectItem value="monthly">Monatlich</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trigger-schedule-time">Uhrzeit (UTC)</Label>
            <Input
              id="trigger-schedule-time"
              type="time"
              value={config.time}
              onChange={(e) => onChange({ ...config, time: e.target.value })}
            />
            <p className="text-text-muted text-xs">
              Deutsche Zeit: UTC+1 (Winter) / UTC+2 (Sommer).
            </p>
          </div>

          {config.frequency === "weekly" ? (
            <div className="space-y-1.5">
              <Label>Wochentag</Label>
              <Select
                value={config.weekday !== undefined ? String(config.weekday) : undefined}
                onValueChange={(value) => onChange({ ...config, weekday: Number(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wochentag wählen" />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {config.weekday === undefined ? (
                <p className="text-warning text-xs">Bitte einen Wochentag auswählen.</p>
              ) : null}
            </div>
          ) : null}

          {config.frequency === "monthly" ? (
            <div className="space-y-1.5">
              <Label htmlFor="trigger-schedule-day">Tag im Monat</Label>
              <Input
                id="trigger-schedule-day"
                type="number"
                min={1}
                max={31}
                value={config.dayOfMonth ?? ""}
                onChange={(e) =>
                  onChange({
                    ...config,
                    dayOfMonth: e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
              />
              <p className="text-text-muted text-xs">31 = letzter Tag des Monats.</p>
              {config.dayOfMonth === undefined ? (
                <p className="text-warning text-xs">Bitte einen Tag im Monat auswählen.</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {config.event === "scheduled_once" ? (
        <div className="space-y-1.5">
          <Label htmlFor="trigger-run-at">Datum &amp; Uhrzeit (UTC)</Label>
          <Input
            id="trigger-run-at"
            type="datetime-local"
            value={toDatetimeLocalValue(config.runAt)}
            onChange={(e) => {
              if (!e.target.value) return;
              onChange({ ...config, runAt: fromDatetimeLocalValue(e.target.value) });
            }}
          />
          <p className="text-text-muted text-xs">
            Deutsche Zeit: UTC+1 (Winter) / UTC+2 (Sommer). Der Workflow pausiert sich nach dem Lauf
            automatisch.
          </p>
        </div>
      ) : null}

      {config.event === "webhook_inbound" ? (
        <div className="space-y-1.5">
          <Label>Eingehende URL</Label>
          {inboundToken ? (
            <>
              <div className="flex gap-2">
                <Input readOnly value={`${origin}/api/public/workflows/${inboundToken}/trigger`} />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    copyToClipboard(`${origin}/api/public/workflows/${inboundToken}/trigger`)
                  }
                >
                  Kopieren
                </Button>
              </div>
              <p className="text-text-muted text-xs">
                POST-Anfragen an diese URL lösen den Workflow aus (max. 64&nbsp;KB JSON-Body). Der
                Body ist über <code>{"{{payload:json}}"}</code> verfügbar.
              </p>
            </>
          ) : (
            <p className="text-text-muted text-xs">Die URL wird nach dem Speichern angezeigt.</p>
          )}
        </div>
      ) : null}

      {config.event === "manual" ? (
        <p className="text-text-muted text-xs">
          Starte den Workflow über den Button „Jetzt ausführen“ im Editor oder auf der
          Workflow-Karte. Dafür muss der Workflow aktiviert sein.
        </p>
      ) : null}

      <div className="space-y-1.5">
        <Label>
          {config.event === "response_submitted" ? "Trigger-Formulare" : "Formulare für den Digest"}
        </Label>
        <MultiSelect
          options={formOptions}
          selected={config.formIds}
          onChange={(formIds) => onChange({ ...config, formIds })}
          placeholder={formsOptional ? "Kein Formular ausgewählt" : "Formular auswählen"}
          emptyLabel="Keine Formulare im Workspace gefunden."
        />
        {formsOptional ? (
          <p className="text-text-muted text-xs">
            Nötig, wenn dieser Workflow Antwort- oder KI-Aktionen ausführt oder{" "}
            <code>{"{{digest:…}}"}</code> verwendet.
          </p>
        ) : config.formIds.length === 0 ? (
          <p className="text-warning text-xs">
            Ohne ausgewähltes Formular kann der Workflow nicht aktiviert werden.
          </p>
        ) : null}
      </div>
    </div>
  );
}
