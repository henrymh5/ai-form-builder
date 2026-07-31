"use client";

import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import type { Field } from "@/lib/form-schema/fields";

/**
 * Renders ONE interactive field bound to react-hook-form — the fillable
 * counterpart to the builder canvas's read-only `FieldCanvasPreview` (plan
 * §23 "React Hook Form... für öffentliches Formular, Validierung,
 * Feldzustände"). This is the piece shared verbatim across builder preview,
 * test mode, and the public renderer (plan §13 "keine zwei getrennte
 * Implementierungen") — those three only ever differ in what wraps this
 * component (page chrome, submit handling), never in how a field renders.
 */
export function RenderField({
  field,
  control,
  errors,
}: {
  field: Field;
  control: Control;
  errors: FieldErrors;
}) {
  if (field.type === "heading") {
    return <h2 className="text-text-primary text-xl font-semibold">{field.label}</h2>;
  }
  if (field.type === "paragraph") {
    return <p className="text-text-secondary text-sm whitespace-pre-wrap">{field.label}</p>;
  }
  if (field.type === "divider") {
    return <hr className="border-border" />;
  }
  if (field.type === "hidden") {
    return (
      <Controller
        name={field.key}
        control={control}
        defaultValue={field.defaultValue ?? ""}
        render={({ field: rhf }) => <input type="hidden" {...rhf} />}
      />
    );
  }

  const error = errors[field.key]?.message as string | undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.key}>
        {field.label}
        {field.required ? <span className="text-error ml-0.5">*</span> : null}
      </Label>
      {field.description ? (
        <p className="text-text-secondary text-xs">{field.description}</p>
      ) : null}

      <FieldControl field={field} control={control} />

      {error ? (
        <p role="alert" className="text-error text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type AnswerableField = Exclude<Field, { type: "heading" | "paragraph" | "divider" | "hidden" }>;

function FieldControl({ field, control }: { field: AnswerableField; control: Control }) {
  switch (field.type) {
    case "long_text":
      return (
        <Controller
          name={field.key}
          control={control}
          defaultValue={field.defaultValue ?? ""}
          render={({ field: rhf }) => (
            <Textarea id={field.key} placeholder={field.placeholder} rows={4} {...rhf} />
          )}
        />
      );

    case "single_choice":
    case "dropdown":
      return (
        <Controller
          name={field.key}
          control={control}
          defaultValue={field.defaultValue ?? ""}
          render={({ field: rhf }) =>
            field.type === "dropdown" ? (
              <Select value={rhf.value} onValueChange={rhf.onChange}>
                <SelectTrigger id={field.key}>
                  <SelectValue placeholder={field.placeholder ?? "Bitte wählen"} />
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
              <RadioGroup value={rhf.value} onValueChange={rhf.onChange} className="space-y-2">
                {field.options.map((option) => (
                  <label key={option.id} className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value={option.value} id={`${field.key}-${option.id}`} />
                    {option.label}
                  </label>
                ))}
              </RadioGroup>
            )
          }
        />
      );

    case "multiple_choice":
      return (
        <Controller
          name={field.key}
          control={control}
          defaultValue={field.defaultValue ?? []}
          render={({ field: rhf }) => {
            const values: string[] = rhf.value ?? [];
            return (
              <div className="space-y-2">
                {field.options.map((option) => (
                  <label key={option.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={values.includes(option.value)}
                      onCheckedChange={(checked) => {
                        rhf.onChange(
                          checked
                            ? [...values, option.value]
                            : values.filter((v) => v !== option.value),
                        );
                      }}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            );
          }}
        />
      );

    case "yes_no":
      return (
        <Controller
          name={field.key}
          control={control}
          defaultValue={field.defaultValue ?? undefined}
          render={({ field: rhf }) => (
            <RadioGroup
              value={rhf.value === undefined ? undefined : String(rhf.value)}
              onValueChange={(v) => rhf.onChange(v === "true")}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="true" id={`${field.key}-yes`} />
                Ja
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="false" id={`${field.key}-no`} />
                Nein
              </label>
            </RadioGroup>
          )}
        />
      );

    case "consent":
      return (
        <Controller
          name={field.key}
          control={control}
          defaultValue={field.defaultValue ?? false}
          render={({ field: rhf }) => (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={rhf.value} onCheckedChange={rhf.onChange} />
              Ich stimme zu
            </label>
          )}
        />
      );

    case "rating":
    case "star_rating":
      return (
        <Controller
          name={field.key}
          control={control}
          defaultValue={field.defaultValue ?? undefined}
          render={({ field: rhf }) => (
            <div className="flex gap-1">
              {Array.from({ length: field.maxRating }, (_, i) => {
                const value = i + 1;
                const isSelected = rhf.value === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => rhf.onChange(value)}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex size-9 items-center justify-center rounded border text-sm",
                      isSelected
                        ? "border-primary bg-primary-subtle text-primary-text"
                        : "border-border text-text-secondary",
                    )}
                  >
                    {field.type === "star_rating" ? "★" : value}
                  </button>
                );
              })}
            </div>
          )}
        />
      );

    case "nps":
      return (
        <Controller
          name={field.key}
          control={control}
          defaultValue={field.defaultValue ?? undefined}
          render={({ field: rhf }) => (
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 11 }, (_, value) => {
                const isSelected = rhf.value === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => rhf.onChange(value)}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex size-8 items-center justify-center rounded border text-xs",
                      isSelected
                        ? "border-primary bg-primary-subtle text-primary-text"
                        : "border-border text-text-secondary",
                    )}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          )}
        />
      );

    case "file_upload":
      return (
        <Controller
          name={field.key}
          control={control}
          defaultValue={[]}
          render={({ field: rhf }) => (
            <input
              id={field.key}
              type="file"
              multiple={(field.validation?.maxFiles ?? 1) > 1}
              accept={field.validation?.allowedFileTypes?.join(",")}
              // The answer value is a list of file references, not the File objects
              // themselves (plan §11.2). Until the signed-upload endpoint exists, store
              // the file names so the schema shape stays correct and submitting works.
              onChange={(e) => rhf.onChange(Array.from(e.target.files ?? []).map((f) => f.name))}
              className="text-text-secondary text-sm"
            />
          )}
        />
      );

    default:
      return (
        <Controller
          name={field.key}
          control={control}
          defaultValue={"defaultValue" in field ? (field.defaultValue ?? "") : ""}
          render={({ field: rhf }) => (
            <Input
              id={field.key}
              placeholder={"placeholder" in field ? field.placeholder : undefined}
              type={
                field.type === "email"
                  ? "email"
                  : field.type === "number"
                    ? "number"
                    : field.type === "date"
                      ? "date"
                      : field.type === "time"
                        ? "time"
                        : "text"
              }
              {...rhf}
              onChange={(e) =>
                rhf.onChange(field.type === "number" ? e.target.valueAsNumber : e.target.value)
              }
            />
          )}
        />
      );
  }
}
