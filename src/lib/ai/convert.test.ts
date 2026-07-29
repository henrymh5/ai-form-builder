import { describe, expect, it } from "vitest";
import { toFormDefinition } from "./convert";
import type { GenerateFormOutput } from "./schemas";
import { formDefinitionSchema } from "@/lib/form-schema/schema";
import { validateFormDefinition, isValid } from "@/lib/form-schema/validate";

const sampleOutput: GenerateFormOutput = {
  title: "Kontaktformular",
  introduction: "Bitte fülle das Formular aus.",
  pages: [
    {
      title: "Deine Daten",
      fields: [
        { type: "short_text", label: "Dein Name", required: true },
        { type: "email", label: "Deine E-Mail-Adresse", required: true },
        {
          type: "single_choice",
          label: "Wie hast du von uns erfahren?",
          required: false,
          options: ["Suchmaschine", "Empfehlung", "Social Media"],
        },
      ],
    },
  ],
  endingTitle: "Vielen Dank!",
};

describe("toFormDefinition", () => {
  it("produces a schema-valid FormDefinition", () => {
    const definition = toFormDefinition(sampleOutput);
    const parsed = formDefinitionSchema.safeParse(definition);
    expect(parsed.success).toBe(true);
  });

  it("passes domain validation with no errors", () => {
    const definition = toFormDefinition(sampleOutput);
    const result = validateFormDefinition(definition);
    expect(isValid(result)).toBe(true);
  });

  it("generates unique, non-empty IDs for every page, field, and option — never trusting AI-provided text as an ID", () => {
    const definition = toFormDefinition(sampleOutput);
    const page = definition.pages[0]!;
    expect(page.id).toMatch(/^pg_/);

    const fieldIds = page.fields.map((f) => f.id);
    expect(new Set(fieldIds).size).toBe(fieldIds.length);
    for (const id of fieldIds) expect(id).toMatch(/^fld_/);

    const choiceField = page.fields[2]!;
    expect(choiceField.type).toBe("single_choice");
    if (choiceField.type === "single_choice") {
      for (const option of choiceField.options) {
        expect(option.id).toMatch(/^opt_/);
      }
    }
  });

  it("assigns unique internal keys derived from labels, resolving collisions", () => {
    const output: GenerateFormOutput = {
      title: "Test",
      pages: [
        {
          fields: [
            { type: "short_text", label: "Name", required: true },
            { type: "short_text", label: "Name", required: true },
          ],
        },
      ],
      endingTitle: "Fertig",
    };
    const definition = toFormDefinition(output);
    const keys = definition.pages[0]!.fields.map((f) => ("key" in f ? f.key : null));
    expect(new Set(keys).size).toBe(2);
  });

  it("defaults to an empty options array of exactly two options when the AI omits them", () => {
    const output: GenerateFormOutput = {
      title: "Test",
      pages: [{ fields: [{ type: "dropdown", label: "Wähle", required: false }] }],
      endingTitle: "Fertig",
    };
    const definition = toFormDefinition(output);
    const field = definition.pages[0]!.fields[0]!;
    expect(field.type).toBe("dropdown");
    if (field.type === "dropdown") {
      expect(field.options).toHaveLength(2);
    }
  });

  it("marks exactly one default ending", () => {
    const definition = toFormDefinition(sampleOutput);
    const defaults = definition.endings.filter((e) => e.isDefault);
    expect(defaults).toHaveLength(1);
  });

  it("applies the suggested theme color when provided", () => {
    const definition = toFormDefinition({
      ...sampleOutput,
      themeSuggestion: { colorPrimary: "#FF5500" },
    });
    expect(definition.theme.colorPrimary).toBe("#FF5500");
  });
});
