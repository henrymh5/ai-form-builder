import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Field } from "@/lib/form-schema/fields";

/**
 * Read-only, non-interactive preview of a field as it will look to a
 * respondent — used on the builder canvas (plan §5 "Mittlerer Bereich").
 * This intentionally does NOT use react-hook-form/validation — that's the
 * public renderer's job (Phase 13). Inputs here are disabled so canvas
 * clicks always mean "select this field", never "type into it".
 */
export function FieldCanvasPreview({ field }: { field: Field }) {
  switch (field.type) {
    case "heading":
      return <h2 className="text-text-primary text-xl font-semibold">{field.label}</h2>;
    case "paragraph":
      return <p className="text-text-secondary text-sm whitespace-pre-wrap">{field.label}</p>;
    case "divider":
      return <hr className="border-border" />;
    case "hidden":
      return (
        <p className="text-text-muted rounded border border-dashed p-2 text-xs">
          Verstecktes Feld: {field.key}
        </p>
      );
    case "long_text":
      return (
        <FieldShell field={field}>
          <Textarea disabled placeholder={field.placeholder} rows={3} />
        </FieldShell>
      );
    case "single_choice":
    case "dropdown":
      return (
        <FieldShell field={field}>
          <div className="space-y-1.5">
            {field.options.map((option) => (
              <label key={option.id} className="flex items-center gap-2 text-sm">
                <input type="radio" disabled className="size-4" />
                {option.label}
              </label>
            ))}
          </div>
        </FieldShell>
      );
    case "multiple_choice":
      return (
        <FieldShell field={field}>
          <div className="space-y-1.5">
            {field.options.map((option) => (
              <label key={option.id} className="flex items-center gap-2 text-sm">
                <Checkbox disabled />
                {option.label}
              </label>
            ))}
          </div>
        </FieldShell>
      );
    case "yes_no":
    case "consent":
      return (
        <FieldShell field={field}>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox disabled />
            {field.type === "consent" ? "Ich stimme zu" : "Ja"}
          </label>
        </FieldShell>
      );
    case "rating":
    case "star_rating":
      return (
        <FieldShell field={field}>
          <div className="flex gap-1">
            {Array.from({ length: field.maxRating }, (_, i) => (
              <span key={i} className="text-text-muted text-lg">
                {field.type === "star_rating" ? "★" : i + 1}
              </span>
            ))}
          </div>
        </FieldShell>
      );
    case "nps":
      return (
        <FieldShell field={field}>
          <div className="flex gap-1">
            {Array.from({ length: 11 }, (_, i) => (
              <span
                key={i}
                className="border-border text-text-muted flex size-7 items-center justify-center rounded border text-xs"
              >
                {i}
              </span>
            ))}
          </div>
        </FieldShell>
      );
    case "file_upload":
      return (
        <FieldShell field={field}>
          <div className="border-border text-text-muted rounded border border-dashed p-4 text-center text-sm">
            Datei hierher ziehen oder auswählen
          </div>
        </FieldShell>
      );
    default:
      return (
        <FieldShell field={field}>
          <Input
            disabled
            placeholder={field.placeholder}
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
          />
        </FieldShell>
      );
  }
}

function FieldShell({
  field,
  children,
}: {
  field: Extract<Field, { label: string; required: boolean }>;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-text-primary text-sm font-medium">
        {field.label}
        {field.required ? <span className="text-error ml-0.5">*</span> : null}
      </label>
      {field.description ? (
        <p className="text-text-secondary text-xs">{field.description}</p>
      ) : null}
      {children}
    </div>
  );
}
