import { describe, expect, it } from "vitest";
import { createEmptyFormDefinition } from "./factory";
import { generateId } from "./ids";
import { formDefinitionSchema } from "./schema";

describe("formDefinitionSchema", () => {
  it("parses a minimal empty form definition", () => {
    const def = createEmptyFormDefinition("Testformular");
    expect(formDefinitionSchema.safeParse(def).success).toBe(true);
  });

  it("rejects a form with no pages", () => {
    const def = createEmptyFormDefinition("Testformular");
    const invalid = { ...def, pages: [] };
    expect(formDefinitionSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects a form with no endings", () => {
    const def = createEmptyFormDefinition("Testformular");
    const invalid = { ...def, endings: [] };
    expect(formDefinitionSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects an unsupported schema version", () => {
    const def = createEmptyFormDefinition("Testformular");
    const invalid = { ...def, schemaVersion: 999 };
    expect(formDefinitionSchema.safeParse(invalid).success).toBe(false);
  });

  it("parses a form with all 21 field types on one page", () => {
    const def = createEmptyFormDefinition("Alle Feldtypen");
    const page = def.pages[0]!;
    page.fields = [
      {
        id: generateId("field"),
        key: "short",
        label: "Kurzer Text",
        required: false,
        type: "short_text",
      },
      {
        id: generateId("field"),
        key: "long",
        label: "Langer Text",
        required: false,
        type: "long_text",
      },
      { id: generateId("field"), key: "email", label: "E-Mail", required: true, type: "email" },
      { id: generateId("field"), key: "phone", label: "Telefon", required: false, type: "phone" },
      { id: generateId("field"), key: "url", label: "URL", required: false, type: "url" },
      { id: generateId("field"), key: "number", label: "Zahl", required: false, type: "number" },
      { id: generateId("field"), key: "date", label: "Datum", required: false, type: "date" },
      { id: generateId("field"), key: "time", label: "Uhrzeit", required: false, type: "time" },
      {
        id: generateId("field"),
        key: "single",
        label: "Einfachauswahl",
        required: false,
        type: "single_choice",
        options: [{ id: generateId("option"), label: "A", value: "a" }],
      },
      {
        id: generateId("field"),
        key: "multi",
        label: "Mehrfachauswahl",
        required: false,
        type: "multiple_choice",
        options: [{ id: generateId("option"), label: "A", value: "a" }],
      },
      {
        id: generateId("field"),
        key: "dropdown",
        label: "Dropdown",
        required: false,
        type: "dropdown",
        options: [{ id: generateId("option"), label: "A", value: "a" }],
      },
      { id: generateId("field"), key: "yesno", label: "Ja/Nein", required: false, type: "yes_no" },
      {
        id: generateId("field"),
        key: "rating",
        label: "Bewertung",
        required: false,
        type: "rating",
        maxRating: 5,
      },
      {
        id: generateId("field"),
        key: "star",
        label: "Sterne",
        required: false,
        type: "star_rating",
        maxRating: 5,
      },
      { id: generateId("field"), key: "nps", label: "NPS", required: false, type: "nps" },
      {
        id: generateId("field"),
        key: "file",
        label: "Datei",
        required: false,
        type: "file_upload",
      },
      {
        id: generateId("field"),
        key: "consent",
        label: "Einwilligung",
        required: true,
        type: "consent",
      },
      {
        id: generateId("field"),
        key: "hidden",
        label: "Versteckt",
        required: false,
        type: "hidden",
      },
      { id: generateId("field"), label: "Überschrift", type: "heading" },
      { id: generateId("field"), label: "Beschreibungstext", type: "paragraph" },
      { id: generateId("field"), type: "divider" },
    ];

    const result = formDefinitionSchema.safeParse(def);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pages[0]!.fields).toHaveLength(21);
    }
  });

  it("rejects a choice field with more than 20 options", () => {
    const def = createEmptyFormDefinition("Zu viele Optionen");
    def.pages[0]!.fields = [
      {
        id: generateId("field"),
        key: "single",
        label: "Einfachauswahl",
        required: false,
        type: "single_choice",
        options: Array.from({ length: 21 }, (_, i) => ({
          id: generateId("option"),
          label: `Option ${i}`,
          value: `opt_${i}`,
        })),
      },
    ];
    expect(formDefinitionSchema.safeParse(def).success).toBe(false);
  });

  it("rejects an invalid field key (uppercase / special chars)", () => {
    const def = createEmptyFormDefinition("Ungültiger Key");
    def.pages[0]!.fields = [
      {
        id: generateId("field"),
        key: "Invalid Key!",
        label: "Test",
        required: false,
        type: "short_text",
      },
    ];
    expect(formDefinitionSchema.safeParse(def).success).toBe(false);
  });
});
