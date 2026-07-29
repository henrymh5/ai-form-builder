import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormRenderer } from "./form-renderer";
import { createEmptyFormDefinition } from "@/lib/form-schema/factory";
import { generateId } from "@/lib/form-schema/ids";
import type { FormDefinition } from "@/lib/form-schema/schema";

function withOneRequiredField(): FormDefinition {
  const definition = createEmptyFormDefinition("Test");
  definition.pages[0]!.fields.push({
    id: generateId("field"),
    type: "short_text",
    key: "name",
    label: "Dein Name",
    required: true,
  });
  return definition;
}

describe("FormRenderer", () => {
  it("renders the first page's fields", () => {
    render(<FormRenderer definition={withOneRequiredField()} mode="test" />);
    expect(screen.getByLabelText(/Dein Name/)).toBeInTheDocument();
  });

  it("blocks advancing past a required field left empty", async () => {
    const user = userEvent.setup();
    render(<FormRenderer definition={withOneRequiredField()} mode="test" />);

    await user.click(screen.getByRole("button", { name: "Weiter" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByLabelText(/Dein Name/)).toBeInTheDocument();
  });

  it("advances to the ending screen after filling the only page", async () => {
    const user = userEvent.setup();
    render(<FormRenderer definition={withOneRequiredField()} mode="test" />);

    await user.type(screen.getByLabelText(/Dein Name/), "Ada");
    await user.click(screen.getByRole("button", { name: "Weiter" }));

    expect(await screen.findByRole("heading", { name: "Vielen Dank!" })).toBeInTheDocument();
    expect(screen.getByText(/Testantwort/)).toBeInTheDocument();
  });

  it("calls onComplete with the collected answers and ending id", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(
      <FormRenderer definition={withOneRequiredField()} mode="test" onComplete={onComplete} />,
    );

    await user.type(screen.getByLabelText(/Dein Name/), "Ada");
    await user.click(screen.getByRole("button", { name: "Weiter" }));

    expect(await screen.findByRole("heading", { name: "Vielen Dank!" })).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledWith({ name: "Ada" }, expect.any(String));
  });

  it("hides a field controlled by a hide_field condition", () => {
    const definition = withOneRequiredField();
    const secondField = {
      id: generateId("field"),
      type: "short_text" as const,
      key: "secret",
      label: "Geheimfeld",
      required: false,
    };
    definition.pages[0]!.fields.push(secondField);
    definition.conditions.push({
      id: generateId("condition"),
      logic: "and",
      rules: [{ fieldId: definition.pages[0]!.fields[0]!.id, operator: "is_not_answered" }],
      action: "hide_field",
      targetId: secondField.id,
    });

    render(<FormRenderer definition={definition} mode="test" />);

    expect(screen.queryByLabelText(/Geheimfeld/)).not.toBeInTheDocument();
  });

  it("does not show a Zurück button when allowBack is false", () => {
    const definition = withOneRequiredField();
    definition.pages.push({ id: generateId("page"), fields: [] });
    definition.settings.allowBack = false;

    render(<FormRenderer definition={definition} mode="test" />);

    expect(screen.queryByRole("button", { name: "Zurück" })).not.toBeInTheDocument();
  });

  it("shows the response-path indicator outside of public mode", () => {
    render(<FormRenderer definition={withOneRequiredField()} mode="preview" />);
    expect(screen.getByTestId("response-path")).toBeInTheDocument();
  });

  it("hides the response-path indicator in public mode", () => {
    render(<FormRenderer definition={withOneRequiredField()} mode="public" />);
    expect(screen.queryByTestId("response-path")).not.toBeInTheDocument();
  });
});
