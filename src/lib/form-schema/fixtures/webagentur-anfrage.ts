import { CURRENT_SCHEMA_VERSION, type FormDefinition } from "../schema";
import { generateId } from "../ids";
import { settingsSchema } from "../settings";
import { themeSchema } from "../theme";

/**
 * Example fixture: "mehrstufiges Anfrageformular für eine Webagentur"
 * (plan §1 / Spec §1). Used as a realistic, hand-checked fixture across
 * Phase 1 tests and later as a Builder/Logic Engine reference (plan §16
 * Phase 1 DoD, Phase 2 fixtures).
 *
 * Reproduces the exact scenario from the spec's example prompt:
 * "Frage nach Unternehmen, Ansprechpartner, gewünschter Leistung, Budget und
 * Projektstart. Interessenten mit einem Budget unter 2.000 Euro sollen eine
 * andere Abschlussseite sehen."
 */
export function buildWebagenturAnfrageFixture(): FormDefinition {
  const companyFieldId = generateId("field");
  const contactFieldId = generateId("field");
  const emailFieldId = generateId("field");
  const serviceFieldId = generateId("field");
  const budgetFieldId = generateId("field");
  const startDateFieldId = generateId("field");
  const scopeFieldId = generateId("field");

  const page1Id = generateId("page");
  const page2Id = generateId("page");
  const largeScopePageId = generateId("page");

  const smallBudgetEndingId = generateId("ending");
  const defaultEndingId = generateId("ending");

  const budgetSmallOptionId = generateId("option");
  const budgetMediumOptionId = generateId("option");
  const budgetLargeOptionId = generateId("option");

  const serviceWebsiteOptionId = generateId("option");
  const serviceShopOptionId = generateId("option");
  const serviceBrandingOptionId = generateId("option");

  const definition: FormDefinition = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    metadata: {
      title: "Projektanfrage",
      description: "Anfrageformular für neue Projekte einer Webagentur.",
      language: "de",
    },
    settings: settingsSchema.parse({ progressDisplay: "bar" }),
    theme: themeSchema.parse({}),
    pages: [
      {
        id: page1Id,
        title: "Über euch",
        fields: [
          {
            id: companyFieldId,
            key: "company",
            label: "Unternehmen",
            required: true,
            type: "short_text",
            validation: { maxLength: 200 },
          },
          {
            id: contactFieldId,
            key: "contact_person",
            label: "Ansprechpartner",
            required: true,
            type: "short_text",
            validation: { maxLength: 200 },
          },
          {
            id: emailFieldId,
            key: "email",
            label: "E-Mail-Adresse",
            required: true,
            type: "email",
          },
        ],
      },
      {
        id: page2Id,
        title: "Euer Projekt",
        fields: [
          {
            id: serviceFieldId,
            key: "service",
            label: "Gewünschte Leistung",
            required: true,
            type: "single_choice",
            options: [
              { id: serviceWebsiteOptionId, label: "Website", value: "website" },
              { id: serviceShopOptionId, label: "Onlineshop", value: "shop" },
              { id: serviceBrandingOptionId, label: "Branding", value: "branding" },
            ],
          },
          {
            id: budgetFieldId,
            key: "budget",
            label: "Budget",
            required: true,
            type: "single_choice",
            options: [
              { id: budgetSmallOptionId, label: "Unter 2.000 €", value: "under_2000" },
              { id: budgetMediumOptionId, label: "2.000 € – 10.000 €", value: "2000_10000" },
              { id: budgetLargeOptionId, label: "Über 10.000 €", value: "over_10000" },
            ],
          },
          {
            id: startDateFieldId,
            key: "project_start",
            label: "Gewünschter Projektstart",
            required: false,
            type: "date",
          },
        ],
      },
      {
        id: largeScopePageId,
        title: "Projektumfang",
        description: "Bei größeren Budgets möchten wir mehr über den Umfang erfahren.",
        fields: [
          {
            id: scopeFieldId,
            key: "scope_details",
            label: "Beschreibt kurz den gewünschten Projektumfang.",
            required: true,
            type: "long_text",
            validation: { maxLength: 2000 },
          },
        ],
      },
    ],
    conditions: [
      {
        id: generateId("condition"),
        logic: "and",
        rules: [{ fieldId: budgetFieldId, operator: "equals", value: "under_2000" }],
        action: "end_form",
        targetId: smallBudgetEndingId,
      },
      {
        id: generateId("condition"),
        logic: "and",
        rules: [{ fieldId: budgetFieldId, operator: "equals", value: "over_10000" }],
        action: "show_page",
        targetId: largeScopePageId,
      },
    ],
    endings: [
      {
        id: smallBudgetEndingId,
        title: "Danke für dein Interesse!",
        description:
          "Für Projekte in diesem Budgetrahmen empfehlen wir unsere Self-Service-Vorlagen. Wir melden uns trotzdem bei dir.",
        isDefault: false,
      },
      {
        id: defaultEndingId,
        title: "Vielen Dank für deine Anfrage!",
        description: "Wir melden uns innerhalb von zwei Werktagen bei dir.",
        isDefault: true,
      },
    ],
  };

  return definition;
}
