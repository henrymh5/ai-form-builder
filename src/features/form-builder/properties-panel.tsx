"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { generateId } from "@/lib/form-schema/ids";
import { hasOptions } from "@/lib/form-schema/fields";
import { useBuilderStore } from "@/features/form-builder/builder-store";
import { AiRewriteDialog } from "@/features/form-builder/ai-rewrite-dialog";
import { AiGenerateOptionsButton } from "@/features/form-builder/ai-generate-options-button";
import { Plus, Trash2 } from "lucide-react";

/**
 * Right sidebar: properties of the selected element (plan §5 "Rechte
 * Seitenleiste"). Fields the plan lists for an email field example are
 * covered here for every applicable type: internal key, visible question,
 * description, placeholder, required, error message, default value,
 * validation. Conditional visibility (last bullet) is wired in Phase 8 once
 * the conditions UI exists — this panel already reads/writes the same
 * `Field` shape so nothing here changes when that lands.
 */
export function PropertiesPanel({ workspaceId, formId }: { workspaceId: string; formId: string }) {
  const definition = useBuilderStore((s) => s.definition);
  const selected = useBuilderStore((s) => s.selected);
  const updateField = useBuilderStore((s) => s.updateField);
  const updatePage = useBuilderStore((s) => s.updatePage);

  if (!definition || !selected) {
    return (
      <aside className="border-border bg-surface w-80 shrink-0 border-l p-4">
        <p className="text-text-secondary text-sm">
          Wähle ein Element aus, um seine Eigenschaften zu bearbeiten.
        </p>
      </aside>
    );
  }

  if (selected.kind === "page") {
    const page = definition.pages.find((p) => p.id === selected.pageId);
    if (!page) return null;
    return (
      <aside className="border-border bg-surface w-80 shrink-0 space-y-5 overflow-y-auto border-l p-4">
        <h2 className="text-text-primary text-sm font-semibold">Seiteneinstellungen</h2>
        <div className="space-y-1.5">
          <Label htmlFor="page-title">Überschrift</Label>
          <Input
            id="page-title"
            value={page.title ?? ""}
            onChange={(e) => updatePage(page.id, { title: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="page-description">Beschreibung</Label>
          <Textarea
            id="page-description"
            value={page.description ?? ""}
            onChange={(e) => updatePage(page.id, { description: e.target.value })}
            rows={3}
          />
        </div>
      </aside>
    );
  }

  const page = definition.pages.find((p) => p.id === selected.pageId);
  const field = page?.fields.find((f) => f.id === selected.fieldId);
  if (!field) return null;

  const isDisplayOnly =
    field.type === "heading" || field.type === "paragraph" || field.type === "divider";

  return (
    <aside className="border-border bg-surface w-80 shrink-0 space-y-5 overflow-y-auto border-l p-4">
      <h2 className="text-text-primary text-sm font-semibold">Eigenschaften</h2>

      {field.type === "divider" ? (
        <p className="text-text-secondary text-sm">Trennbereiche haben keine Einstellungen.</p>
      ) : (
        <>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="prop-label">{isDisplayOnly ? "Text" : "Sichtbare Frage"}</Label>
              {!isDisplayOnly ? (
                <AiRewriteDialog
                  workspaceId={workspaceId}
                  formId={formId}
                  currentLabel={field.label}
                  currentDescription={"description" in field ? field.description : undefined}
                  onAccept={(newLabel) =>
                    updateField(selected.pageId, field.id, { label: newLabel })
                  }
                />
              ) : null}
            </div>
            {field.type === "paragraph" ? (
              <Textarea
                id="prop-label"
                value={field.label}
                onChange={(e) => updateField(selected.pageId, field.id, { label: e.target.value })}
                rows={3}
              />
            ) : (
              <Input
                id="prop-label"
                value={field.label}
                onChange={(e) => updateField(selected.pageId, field.id, { label: e.target.value })}
              />
            )}
          </div>

          {!isDisplayOnly && "key" in field ? (
            <div className="space-y-1.5">
              <Label htmlFor="prop-key">Interne Feldbezeichnung</Label>
              <Input
                id="prop-key"
                value={field.key}
                onChange={(e) => updateField(selected.pageId, field.id, { key: e.target.value })}
              />
            </div>
          ) : null}

          {!isDisplayOnly && "description" in field ? (
            <div className="space-y-1.5">
              <Label htmlFor="prop-description">Beschreibung</Label>
              <Textarea
                id="prop-description"
                value={field.description ?? ""}
                onChange={(e) =>
                  updateField(selected.pageId, field.id, { description: e.target.value })
                }
                rows={2}
              />
            </div>
          ) : null}

          {!isDisplayOnly && "placeholder" in field ? (
            <div className="space-y-1.5">
              <Label htmlFor="prop-placeholder">Platzhalter</Label>
              <Input
                id="prop-placeholder"
                value={field.placeholder ?? ""}
                onChange={(e) =>
                  updateField(selected.pageId, field.id, { placeholder: e.target.value })
                }
              />
            </div>
          ) : null}

          {!isDisplayOnly && "required" in field ? (
            <div className="flex items-center justify-between">
              <Label htmlFor="prop-required">Pflichtfeld</Label>
              <Switch
                id="prop-required"
                checked={field.required}
                onCheckedChange={(checked) =>
                  updateField(selected.pageId, field.id, { required: checked })
                }
              />
            </div>
          ) : null}

          {hasOptions(field) ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Optionen</Label>
                <AiGenerateOptionsButton
                  workspaceId={workspaceId}
                  formId={formId}
                  label={field.label}
                  onAccept={(newOptions) =>
                    updateField(selected.pageId, field.id, {
                      options: newOptions.map((label) => ({
                        id: generateId("option"),
                        label,
                        value: label.toLowerCase().replace(/\s+/g, "_").slice(0, 100) || "option",
                      })),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                {field.options.map((option, index) => (
                  <div key={option.id} className="flex items-center gap-1.5">
                    <Input
                      value={option.label}
                      onChange={(e) => {
                        const options = [...field.options];
                        options[index] = {
                          ...option,
                          label: e.target.value,
                          value: e.target.value.toLowerCase().replace(/\s+/g, "_") || option.value,
                        };
                        updateField(selected.pageId, field.id, { options });
                      }}
                    />
                    <button
                      type="button"
                      aria-label="Option entfernen"
                      disabled={field.options.length <= 1}
                      onClick={() => {
                        const options = field.options.filter((_, i) => i !== index);
                        updateField(selected.pageId, field.id, { options });
                      }}
                      className={cn(
                        "text-text-muted hover:text-error shrink-0 rounded p-1.5",
                        field.options.length <= 1 && "pointer-events-none opacity-40",
                      )}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  const n = field.options.length + 1;
                  updateField(selected.pageId, field.id, {
                    options: [
                      ...field.options,
                      { id: generateId("option"), label: `Option ${n}`, value: `option_${n}` },
                    ],
                  });
                }}
              >
                <Plus className="size-3.5" />
                Option hinzufügen
              </Button>
            </div>
          ) : null}

          {field.type === "rating" || field.type === "star_rating" ? (
            <div className="space-y-1.5">
              <Label htmlFor="prop-max-rating">Maximalwert</Label>
              <Input
                id="prop-max-rating"
                type="number"
                min={2}
                max={10}
                value={field.maxRating}
                onChange={(e) =>
                  updateField(selected.pageId, field.id, {
                    maxRating: Number(e.target.value) || 5,
                  })
                }
              />
            </div>
          ) : null}

          {"validation" in field ? (
            <div className="space-y-1.5">
              <Label htmlFor="prop-error-message">Fehlermeldung</Label>
              <Input
                id="prop-error-message"
                value={field.validation?.errorMessage ?? ""}
                onChange={(e) =>
                  updateField(selected.pageId, field.id, {
                    validation: { ...field.validation, errorMessage: e.target.value },
                  })
                }
              />
            </div>
          ) : null}
        </>
      )}
    </aside>
  );
}
