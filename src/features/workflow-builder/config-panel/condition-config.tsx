"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OPERATORS_BY_FIELD_TYPE, type ConditionRule, type Operator } from "@/lib/form-schema/conditions";
import { isAnswerableField, type Field } from "@/lib/form-schema/fields";
import type { FormDefinition } from "@/lib/form-schema/schema";
import type { WorkflowNode } from "@/lib/workflow-schema/schema";
import { FieldPicker } from "./field-picker";

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

const NO_VALUE_OPERATORS: Operator[] = ["is_answered", "is_not_answered"];

type ConditionConfig = Extract<WorkflowNode, { type: "condition" }>["config"];
type AnswerableField = Extract<Field, { key: string }>;

export function ConditionConfigForm({
  config,
  form,
  onChange,
}: {
  config: ConditionConfig;
  form: FormDefinition;
  onChange: (config: ConditionConfig) => void;
}) {
  const fields: AnswerableField[] = form.pages
    .flatMap((p) => p.fields)
    .filter((f): f is AnswerableField => isAnswerableField(f));

  function updateRule(index: number, patch: Partial<ConditionRule>) {
    const rules = config.rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule));
    onChange({ ...config, rules });
  }

  function removeRule(index: number) {
    onChange({ ...config, rules: config.rules.filter((_, i) => i !== index) });
  }

  function addRule() {
    const firstField = fields[0];
    if (!firstField) return;
    const operators = OPERATORS_BY_FIELD_TYPE[firstField.type];
    onChange({
      ...config,
      rules: [...config.rules, { fieldId: firstField.id, operator: operators[0]! }],
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Verknüpfung</Label>
        <Select
          value={config.logic}
          onValueChange={(value) => onChange({ ...config, logic: value as "and" | "or" })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="and">Alle Bedingungen (UND)</SelectItem>
            <SelectItem value="or">Mindestens eine (ODER)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {config.rules.map((rule, index) => {
          const field = fields.find((f) => f.id === rule.fieldId);
          const operators: readonly Operator[] = field ? OPERATORS_BY_FIELD_TYPE[field.type] : [];
          const needsValue = !NO_VALUE_OPERATORS.includes(rule.operator);

          return (
            <div key={index} className="border-border space-y-2 rounded-md border p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <FieldPicker
                    form={form}
                    value={rule.fieldId}
                    onChange={(fieldId) => {
                      const nextField = fields.find((f) => f.id === fieldId);
                      const nextOperators: readonly Operator[] = nextField
                        ? OPERATORS_BY_FIELD_TYPE[nextField.type]
                        : [];
                      updateRule(index, { fieldId, operator: nextOperators[0] ?? "is_answered" });
                    }}
                  />
                  <Select
                    value={rule.operator}
                    onValueChange={(value) => updateRule(index, { operator: value as Operator })}
                  >
                    <SelectTrigger>
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
                  {needsValue ? (
                    <Input
                      value={typeof rule.value === "string" ? rule.value : (rule.value?.toString() ?? "")}
                      onChange={(e) => updateRule(index, { value: e.target.value })}
                      placeholder="Wert"
                    />
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Bedingung entfernen"
                  onClick={() => removeRule(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Button type="button" variant="secondary" size="sm" onClick={addRule} disabled={fields.length === 0}>
        <Plus className="size-4" />
        Bedingung hinzufügen
      </Button>
    </div>
  );
}
