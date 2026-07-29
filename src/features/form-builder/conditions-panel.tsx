"use client";

import { useState } from "react";
import { Plus, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBuilderStore } from "@/features/form-builder/builder-store";
import { isAnswerableField, hasOptions, type Field } from "@/lib/form-schema/fields";
import { OPERATORS_BY_FIELD_TYPE, type Condition, type ConditionRule, type Operator } from "@/lib/form-schema/conditions";
import { formDefinitionSchema } from "@/lib/form-schema/schema";
import { validateFormDefinition } from "@/lib/form-schema/validate";
import { logicEngineGraphAnalysis } from "@/lib/logic-engine/wire-validation";

const OPERATOR_LABEL: Record<Operator, string> = {
  equals: "ist gleich",
  not_equals: "ist nicht gleich",
  contains: "enthält",
  not_contains: "enthält nicht",
  is_answered: "ist ausgefüllt",
  is_not_answered: "ist nicht ausgefüllt",
  greater_than: "ist größer als",
  less_than: "ist kleiner als",
  before_date: "ist vor einem Datum",
  after_date: "ist nach einem Datum",
  selection_includes: "Auswahl enthält Option",
};

const ACTION_LABEL: Record<Condition["action"], string> = {
  show_field: "Feld anzeigen",
  hide_field: "Feld ausblenden",
  show_page: "Seite anzeigen",
  skip_page: "Seite überspringen",
  jump_to_page: "zu Seite springen",
  end_form: "Formular beenden",
};

const TARGET_KIND_BY_ACTION: Record<Condition["action"], "field" | "page" | "ending"> = {
  show_field: "field",
  hide_field: "field",
  show_page: "page",
  skip_page: "page",
  jump_to_page: "page",
  end_form: "ending",
};

function allAnswerableFields(
  definition: NonNullable<ReturnType<typeof useBuilderStore.getState>["definition"]>,
): { field: Field; pageIndex: number }[] {
  return definition.pages.flatMap((page, pageIndex) =>
    page.fields.filter(isAnswerableField).map((field) => ({ field, pageIndex })),
  );
}

/** Conditional logic editor (plan §8) — reads/writes `definition.conditions` via the Builder Store. */
export function ConditionsPanel() {
  const [open, setOpen] = useState(false);
  const definition = useBuilderStore((s) => s.definition);
  const addCondition = useBuilderStore((s) => s.addCondition);
  const removeCondition = useBuilderStore((s) => s.removeCondition);

  if (!definition) return null;

  const warnings = (() => {
    const parsed = formDefinitionSchema.safeParse(definition);
    if (!parsed.success) return [];
    const result = validateFormDefinition(parsed.data, logicEngineGraphAnalysis);
    return [...result.errors, ...result.warnings];
  })();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Bedingungen
        {warnings.length > 0 ? (
          <span className="bg-warning-subtle text-warning ml-1 rounded-full px-1.5 text-xs font-medium">
            {warnings.length}
          </span>
        ) : null}
      </Button>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bedingte Logik</DialogTitle>
        </DialogHeader>

        {warnings.length > 0 ? (
          <div className="border-warning/30 bg-warning-subtle mb-4 space-y-1.5 rounded-md border p-3">
            {warnings.map((w, i) => (
              <p key={i} className="text-warning flex items-start gap-1.5 text-sm">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                {w.message}
              </p>
            ))}
          </div>
        ) : null}

        <div className="max-h-[50vh] space-y-3 overflow-y-auto">
          {definition.conditions.length === 0 ? (
            <p className="text-text-secondary text-sm">Noch keine Bedingungen angelegt.</p>
          ) : (
            definition.conditions.map((condition) => (
              <ConditionEditor
                key={condition.id}
                condition={condition}
                onRemove={() => removeCondition(condition.id)}
              />
            ))
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const fields = allAnswerableFields(definition);
              const firstField = fields[0]?.field;
              if (!firstField) return;
              addCondition({
                logic: "and",
                rules: [{ fieldId: firstField.id, operator: "is_answered" }],
                action: "show_field",
                targetId: undefined,
              });
            }}
          >
            <Plus className="size-4" />
            Bedingung hinzufügen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConditionEditor({
  condition,
  onRemove,
}: {
  condition: Condition;
  onRemove: () => void;
}) {
  const definition = useBuilderStore((s) => s.definition)!;
  const updateCondition = useBuilderStore((s) => s.updateCondition);
  const fields = allAnswerableFields(definition);

  function updateRule(index: number, patch: Partial<ConditionRule>) {
    const rules = condition.rules.map((r, i) => (i === index ? { ...r, ...patch } : r));
    updateCondition(condition.id, { rules });
  }

  function addRule() {
    const firstField = fields[0]?.field;
    if (!firstField) return;
    updateCondition(condition.id, {
      rules: [...condition.rules, { fieldId: firstField.id, operator: "is_answered" }],
    });
  }

  function removeRule(index: number) {
    if (condition.rules.length <= 1) return;
    updateCondition(condition.id, { rules: condition.rules.filter((_, i) => i !== index) });
  }

  const targetKind = TARGET_KIND_BY_ACTION[condition.action];

  return (
    <div className="border-border space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span>Wenn</span>
          <Select
            value={condition.logic}
            onValueChange={(value) => updateCondition(condition.id, { logic: value as "and" | "or" })}
          >
            <SelectTrigger className="h-8 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="and">alle</SelectItem>
              <SelectItem value="or">eine</SelectItem>
            </SelectContent>
          </Select>
          <span>der folgenden Bedingungen zutrifft:</span>
        </div>
        <button
          type="button"
          aria-label="Bedingung entfernen"
          onClick={onRemove}
          className="text-text-muted hover:text-error rounded p-1"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="space-y-2">
        {condition.rules.map((rule, index) => (
          <RuleRow
            key={index}
            rule={rule}
            fields={fields.map((f) => f.field)}
            onChange={(patch) => updateRule(index, patch)}
            onRemove={() => removeRule(index)}
            canRemove={condition.rules.length > 1}
          />
        ))}
        <Button type="button" variant="ghost" size="sm" onClick={addRule}>
          <Plus className="size-3.5" />
          Regel
        </Button>
      </div>

      <div className="border-border flex items-center gap-2 border-t pt-3 text-sm">
        <span>Dann:</span>
        <Select
          value={condition.action}
          onValueChange={(value) =>
            updateCondition(condition.id, {
              action: value as Condition["action"],
              targetId: undefined,
            })
          }
        >
          <SelectTrigger className="h-8 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ACTION_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {targetKind === "field" ? (
          <Select
            value={condition.targetId ?? ""}
            onValueChange={(value) => updateCondition(condition.id, { targetId: value })}
          >
            <SelectTrigger className="h-8 flex-1">
              <SelectValue placeholder="Feld wählen" />
            </SelectTrigger>
            <SelectContent>
              {fields.map(({ field }) => (
                <SelectItem key={field.id} value={field.id}>
                  {"label" in field ? field.label : field.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : targetKind === "page" ? (
          <Select
            value={condition.targetId ?? ""}
            onValueChange={(value) => updateCondition(condition.id, { targetId: value })}
          >
            <SelectTrigger className="h-8 flex-1">
              <SelectValue placeholder="Seite wählen" />
            </SelectTrigger>
            <SelectContent>
              {definition.pages.map((page, i) => (
                <SelectItem key={page.id} value={page.id}>
                  {page.title || `Seite ${i + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select
            value={condition.targetId ?? ""}
            onValueChange={(value) => updateCondition(condition.id, { targetId: value })}
          >
            <SelectTrigger className="h-8 flex-1">
              <SelectValue placeholder="Abschlussseite wählen (optional)" />
            </SelectTrigger>
            <SelectContent>
              {definition.endings.map((ending) => (
                <SelectItem key={ending.id} value={ending.id}>
                  {ending.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

function RuleRow({
  rule,
  fields,
  onChange,
  onRemove,
  canRemove,
}: {
  rule: ConditionRule;
  fields: Field[];
  onChange: (patch: Partial<ConditionRule>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const field = fields.find((f) => f.id === rule.fieldId);
  const operators: readonly Operator[] =
    field && field.type in OPERATORS_BY_FIELD_TYPE
      ? OPERATORS_BY_FIELD_TYPE[field.type as keyof typeof OPERATORS_BY_FIELD_TYPE]
      : [];

  return (
    <div className="flex items-center gap-1.5">
      <Select value={rule.fieldId} onValueChange={(value) => onChange({ fieldId: value })}>
        <SelectTrigger className="h-8 flex-1">
          <SelectValue placeholder="Feld wählen" />
        </SelectTrigger>
        <SelectContent>
          {fields.map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {"label" in f ? f.label : f.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={rule.operator}
        onValueChange={(value) => onChange({ operator: value as Operator, value: undefined })}
      >
        <SelectTrigger className="h-8 w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op} value={op}>
              {OPERATOR_LABEL[op]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {rule.operator !== "is_answered" && rule.operator !== "is_not_answered" ? (
        field && hasOptions(field) ? (
          <Select
            value={typeof rule.value === "string" ? rule.value : ""}
            onValueChange={(value) => onChange({ value })}
          >
            <SelectTrigger className="h-8 w-40">
              <SelectValue placeholder="Wert" />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option) => (
                <SelectItem key={option.id} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            className="h-8 w-40"
            type={
              rule.operator === "before_date" || rule.operator === "after_date"
                ? "date"
                : rule.operator === "greater_than" || rule.operator === "less_than"
                  ? "number"
                  : "text"
            }
            value={typeof rule.value === "string" || typeof rule.value === "number" ? rule.value : ""}
            onChange={(e) =>
              onChange({
                value:
                  rule.operator === "greater_than" || rule.operator === "less_than"
                    ? Number(e.target.value)
                    : e.target.value,
              })
            }
          />
        )
      ) : null}

      {canRemove ? (
        <button
          type="button"
          aria-label="Regel entfernen"
          onClick={onRemove}
          className="text-text-muted hover:text-error shrink-0 rounded p-1.5"
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
