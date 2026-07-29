import { describe, expect, it } from "vitest";
import { buildResponsesCsv } from "./responses-csv";
import { createEmptyFormDefinition } from "@/lib/form-schema/factory";
import type { ExportableResponse } from "@/lib/db/repositories/responses";
import type { FormDefinition } from "@/lib/form-schema/schema";

function definitionWithFields(): FormDefinition {
  const definition = createEmptyFormDefinition("Test Form");
  definition.pages[0]!.fields = [
    {
      id: "fld_name",
      key: "name",
      type: "short_text",
      label: "Dein Name",
      required: true,
    },
    {
      id: "fld_color",
      key: "color",
      type: "single_choice",
      label: "Lieblingsfarbe",
      required: false,
      options: [
        { id: "opt_1", label: "Rot", value: "red" },
        { id: "opt_2", label: "Blau", value: "blue" },
      ],
    },
  ];
  return definition;
}

describe("buildResponsesCsv", () => {
  it("includes metadata columns and one column per answerable field", () => {
    const definition = definitionWithFields();
    const responses: ExportableResponse[] = [
      {
        id: "resp_1",
        formVersionId: "v1",
        status: "completed",
        submittedAt: "2026-01-01T10:00:00.000Z",
        durationMs: 42000,
        answers: [
          { fieldId: "fld_name", fieldType: "short_text", value: "Ada Lovelace" },
          { fieldId: "fld_color", fieldType: "single_choice", value: "blue" },
        ],
      },
    ];

    const csv = buildResponsesCsv(responses, new Map([["v1", definition]]));

    expect(csv).toContain("Eingang,Status,Bearbeitungszeit (s),Dein Name,Lieblingsfarbe");
    expect(csv).toContain("Ada Lovelace");
    // Choice field values are resolved to their option label, not the raw value.
    expect(csv).toContain("Blau");
    expect(csv).not.toContain(",blue");
    expect(csv).toContain("Abgeschlossen");
    expect(csv).toContain("42");
  });

  it("leaves a blank cell for a skipped optional field", () => {
    const definition = definitionWithFields();
    const responses: ExportableResponse[] = [
      {
        id: "resp_1",
        formVersionId: "v1",
        status: "completed",
        submittedAt: "2026-01-01T10:00:00.000Z",
        durationMs: null,
        answers: [{ fieldId: "fld_name", fieldType: "short_text", value: "Ada Lovelace" }],
      },
    ];

    const csv = buildResponsesCsv(responses, new Map([["v1", definition]]));
    const dataLine = csv.split("\r\n")[1]!;
    expect(dataLine.endsWith(",")).toBe(true);
  });

  it("escapes a formula-injection answer so it cannot execute when opened", () => {
    const definition = definitionWithFields();
    const responses: ExportableResponse[] = [
      {
        id: "resp_1",
        formVersionId: "v1",
        status: "completed",
        submittedAt: "2026-01-01T10:00:00.000Z",
        durationMs: null,
        answers: [{ fieldId: "fld_name", fieldType: "short_text", value: "=cmd|'/c calc'!A1" }],
      },
    ];

    const csv = buildResponsesCsv(responses, new Map([["v1", definition]]));
    expect(csv).toContain("'=cmd");
  });

  it("unions fields across multiple versions when a form's questions changed over time", () => {
    const v1 = definitionWithFields();
    const v2 = definitionWithFields();
    v2.pages[0]!.fields.push({
      id: "fld_extra",
      key: "extra",
      type: "short_text",
      label: "Zusatzfrage",
      required: false,
    });

    const responses: ExportableResponse[] = [
      {
        id: "resp_1",
        formVersionId: "v1",
        status: "completed",
        submittedAt: "2026-01-01T10:00:00.000Z",
        durationMs: null,
        answers: [{ fieldId: "fld_name", fieldType: "short_text", value: "Alice" }],
      },
      {
        id: "resp_2",
        formVersionId: "v2",
        status: "completed",
        submittedAt: "2026-01-02T10:00:00.000Z",
        durationMs: null,
        answers: [
          { fieldId: "fld_name", fieldType: "short_text", value: "Bob" },
          { fieldId: "fld_extra", fieldType: "short_text", value: "Zusatzantwort" },
        ],
      },
    ];

    const csv = buildResponsesCsv(
      responses,
      new Map([
        ["v1", v1],
        ["v2", v2],
      ]),
    );

    expect(csv).toContain("Zusatzfrage");
    expect(csv).toContain("Zusatzantwort");
    const lines = csv.trim().split("\r\n");
    expect(lines).toHaveLength(3); // header + 2 responses
  });
});
