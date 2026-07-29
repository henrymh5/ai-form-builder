import { generateId } from "@/lib/form-schema/ids";
import { CURRENT_SCHEMA_VERSION, type FormDefinition } from "@/lib/form-schema/schema";
import { settingsSchema } from "@/lib/form-schema/settings";
import { themeSchema } from "@/lib/form-schema/theme";
import type { Field } from "@/lib/form-schema/fields";
import type { GenerateFormOutput, AiField } from "@/lib/ai/schemas";

/**
 * Converts Claude's structured output into a real `FormDefinition` — every
 * ID, internal field `key`, and default value is generated here in
 * application code, never taken from the model (plan §6/§11: "IDs dürfen
 * nicht von Claude generiert oder blind aus einer kopierten Definition
 * übernommen werden" applies equally to freshly-generated AI output).
 */
export function toFormDefinition(output: GenerateFormOutput): FormDefinition {
  const usedKeys = new Set<string>();

  function keyFor(label: string): string {
    const base =
      label
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 40) || "field";
    let key = base;
    let n = 1;
    while (usedKeys.has(key)) {
      n += 1;
      key = `${base}_${n}`;
    }
    usedKeys.add(key);
    return key;
  }

  function toField(aiField: AiField): Field {
    const id = generateId("field");

    if (aiField.type === "heading" || aiField.type === "paragraph") {
      return { id, type: aiField.type, label: aiField.label };
    }

    const base = {
      id,
      key: keyFor(aiField.label),
      label: aiField.label,
      description: aiField.description,
      placeholder: aiField.placeholder,
      required: aiField.required,
    };

    if (
      aiField.type === "single_choice" ||
      aiField.type === "multiple_choice" ||
      aiField.type === "dropdown"
    ) {
      const rawOptions =
        aiField.options && aiField.options.length > 0 ? aiField.options : ["Option 1", "Option 2"];
      return {
        ...base,
        type: aiField.type,
        options: rawOptions.map((label) => ({
          id: generateId("option"),
          label,
          value: label.toLowerCase().replace(/\s+/g, "_").slice(0, 100) || "option",
        })),
      } as Field;
    }

    if (aiField.type === "rating" || aiField.type === "star_rating") {
      return { ...base, type: aiField.type, maxRating: 5 } as Field;
    }

    return { ...base, type: aiField.type } as Field;
  }

  const pages = output.pages.map((page) => ({
    id: generateId("page"),
    title: page.title,
    description: page.description,
    fields: page.fields.map(toField),
  }));

  const defaultEndingId = generateId("ending");

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    metadata: {
      title: output.title,
      description: output.introduction,
      language: "de",
    },
    settings: settingsSchema.parse({}),
    theme: themeSchema.parse(
      output.themeSuggestion?.colorPrimary
        ? { colorPrimary: output.themeSuggestion.colorPrimary }
        : {},
    ),
    pages,
    conditions: [],
    endings: [{ id: defaultEndingId, title: output.endingTitle, isDefault: true }],
  };
}
