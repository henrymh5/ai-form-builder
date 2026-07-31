import { describe, expect, it } from "vitest";
import { createEmptyFormDefinition } from "@/lib/form-schema/factory";
import type { FormDefinition } from "@/lib/form-schema/schema";
import type { RunContext } from "./context";
import { resolvePlaceholders } from "./placeholders";

function baseForm(): FormDefinition {
  const form = createEmptyFormDefinition("Testformular");
  form.pages[0]!.fields = [
    { id: "fld_budget", key: "budget", label: "Budget", required: false, type: "number" },
    { id: "fld_email", key: "email", label: "E-Mail", required: false, type: "email" },
  ];
  return form;
}

function makeContext(overrides: Partial<RunContext> = {}): RunContext {
  return {
    runId: "run_1",
    workflowId: "wf_1",
    triggerType: "response_submitted",
    formId: "form_1",
    responseId: "resp_1",
    isTest: false,
    dryRun: false,
    form: baseForm(),
    answers: {},
    rawAnswers: [],
    response: { id: "resp_1", submittedAt: "2026-01-01T10:00:00.000Z" },
    digest: null,
    webhookPayload: null,
    workflow: { id: "wf_1", name: "Test-Workflow", webhookSecret: null },
    createdByUserId: "user_1",
    creatorEmail: "creator@example.com",
    workspaceId: "ws_1",
    ...overrides,
  };
}

describe("resolvePlaceholders", () => {
  it("resolves a known field placeholder", () => {
    const ctx = makeContext({
      rawAnswers: [{ fieldId: "fld_budget", fieldType: "number", value: 5000 }],
    });
    expect(resolvePlaceholders("Budget: {{field:fld_budget}}", ctx)).toBe("Budget: 5000");
  });

  it("resolves an unknown field placeholder to an empty string", () => {
    const ctx = makeContext({ rawAnswers: [] });
    expect(resolvePlaceholders("Budget: {{field:fld_unknown}}", ctx)).toBe("Budget: ");
  });

  it("formats array values as a comma-separated list", () => {
    const ctx = makeContext({
      rawAnswers: [{ fieldId: "fld_budget", fieldType: "multiple_choice", value: ["a", "b"] }],
    });
    expect(resolvePlaceholders("{{field:fld_budget}}", ctx)).toBe("a, b");
  });

  it("formats boolean values as Ja/Nein", () => {
    const ctx = makeContext({
      rawAnswers: [{ fieldId: "fld_budget", fieldType: "yes_no", value: true }],
    });
    expect(resolvePlaceholders("{{field:fld_budget}}", ctx)).toBe("Ja");
  });

  it("resolves form:title and response:id/submittedAt", () => {
    const ctx = makeContext();
    expect(resolvePlaceholders("{{form:title}}", ctx)).toBe("Testformular");
    expect(resolvePlaceholders("{{response:id}}", ctx)).toBe("resp_1");
    expect(resolvePlaceholders("{{response:submittedAt}}", ctx)).toBe("2026-01-01T10:00:00.000Z");
  });

  it("resolves response:all to a labeled list of all answers", () => {
    const ctx = makeContext({
      rawAnswers: [
        { fieldId: "fld_budget", fieldType: "number", value: 5000 },
        { fieldId: "fld_email", fieldType: "email", value: "a@b.de" },
      ],
    });
    expect(resolvePlaceholders("{{response:all}}", ctx)).toBe("Budget: 5000\nE-Mail: a@b.de");
  });

  it("resolves multiple placeholders in one template", () => {
    const ctx = makeContext({
      rawAnswers: [{ fieldId: "fld_budget", fieldType: "number", value: 5000 }],
    });
    expect(
      resolvePlaceholders("Hallo, Budget ist {{field:fld_budget}} für {{form:title}}.", ctx),
    ).toBe("Hallo, Budget ist 5000 für Testformular.");
  });
});
