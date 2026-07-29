"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { WorkflowNode } from "@/lib/workflow-schema/schema";

type AiActionConfig = Extract<WorkflowNode, { type: "aiAction" }>["config"];

export function AiActionConfigForm({
  config,
  onChange,
}: {
  config: AiActionConfig;
  onChange: (config: AiActionConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Aufgabe</Label>
        <Select
          value={config.task}
          onValueChange={(value) => onChange({ ...config, task: value as AiActionConfig["task"] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="summarize">Zusammenfassen</SelectItem>
            <SelectItem value="classify">Einordnen (Kategorien)</SelectItem>
            <SelectItem value="translate">Übersetzen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.task === "classify" ? (
        <div className="space-y-1.5">
          <Label>Kategorien</Label>
          <div className="space-y-1.5">
            {(config.categories ?? []).map((category, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <Input
                  value={category}
                  onChange={(e) => {
                    const categories = [...(config.categories ?? [])];
                    categories[index] = e.target.value;
                    onChange({ ...config, categories });
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Kategorie entfernen"
                  onClick={() =>
                    onChange({
                      ...config,
                      categories: (config.categories ?? []).filter((_, i) => i !== index),
                    })
                  }
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              onChange({ ...config, categories: [...(config.categories ?? []), ""] })
            }
          >
            <Plus className="size-4" />
            Kategorie hinzufügen
          </Button>
        </div>
      ) : null}

      {config.task === "translate" ? (
        <div className="space-y-1.5">
          <Label htmlFor="target-language">Zielsprache</Label>
          <Input
            id="target-language"
            value={config.targetLanguage ?? ""}
            onChange={(e) => onChange({ ...config, targetLanguage: e.target.value })}
            placeholder="z. B. Englisch"
          />
        </div>
      ) : null}

      <p className="text-text-muted text-xs">
        Das Ergebnis wird als Notiz an der Antwort gespeichert.
      </p>
    </div>
  );
}
