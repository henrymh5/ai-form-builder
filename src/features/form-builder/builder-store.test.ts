import { beforeEach, describe, expect, it } from "vitest";
import { createEmptyFormDefinition } from "@/lib/form-schema/factory";
import { useBuilderStore } from "./builder-store";

function reset() {
  const definition = createEmptyFormDefinition("Test Form");
  useBuilderStore.setState({
    definition,
    currentPageId: definition.pages[0]!.id,
    selected: null,
    past: [],
    future: [],
  });
  return definition;
}

describe("builder store", () => {
  beforeEach(() => {
    reset();
  });

  it("adds a field to a page and selects it", () => {
    const { definition, addField } = useBuilderStore.getState();
    const pageId = definition!.pages[0]!.id;

    const fieldId = addField(pageId, "short_text");

    const state = useBuilderStore.getState();
    expect(state.definition!.pages[0]!.fields).toHaveLength(1);
    expect(state.definition!.pages[0]!.fields[0]!.id).toBe(fieldId);
    expect(state.selected).toEqual({ kind: "field", pageId, fieldId });
  });

  it("assigns non-colliding default keys for repeated field types", () => {
    const { definition, addField } = useBuilderStore.getState();
    const pageId = definition!.pages[0]!.id;

    addField(pageId, "short_text");
    addField(pageId, "short_text");

    const fields = useBuilderStore.getState().definition!.pages[0]!.fields;
    const keys = fields.map((f) => ("key" in f ? f.key : null));
    expect(new Set(keys).size).toBe(2);
  });

  it("updates a field's properties", () => {
    const { definition, addField, updateField } = useBuilderStore.getState();
    const pageId = definition!.pages[0]!.id;
    const fieldId = addField(pageId, "short_text");

    updateField(pageId, fieldId, { label: "Dein Name" });

    const field = useBuilderStore.getState().definition!.pages[0]!.fields[0]!;
    expect("label" in field && field.label).toBe("Dein Name");
  });

  it("toggles required and clears selection on remove", () => {
    const { definition, addField, toggleRequired, removeField } = useBuilderStore.getState();
    const pageId = definition!.pages[0]!.id;
    const fieldId = addField(pageId, "short_text");

    toggleRequired(pageId, fieldId);
    expect(
      (useBuilderStore.getState().definition!.pages[0]!.fields[0] as { required: boolean })
        .required,
    ).toBe(true);

    removeField(pageId, fieldId);
    expect(useBuilderStore.getState().definition!.pages[0]!.fields).toHaveLength(0);
    expect(useBuilderStore.getState().selected).toBeNull();
  });

  it("duplicates a field with a new id and derived key", () => {
    const { definition, addField, duplicateField } = useBuilderStore.getState();
    const pageId = definition!.pages[0]!.id;
    const fieldId = addField(pageId, "short_text");

    duplicateField(pageId, fieldId);

    const fields = useBuilderStore.getState().definition!.pages[0]!.fields;
    expect(fields).toHaveLength(2);
    expect(fields[1]!.id).not.toBe(fieldId);
  });

  it("moves a field between pages", () => {
    const { addPage, definition, addField, moveField } = useBuilderStore.getState();
    const pageAId = definition!.pages[0]!.id;
    const fieldId = addField(pageAId, "short_text");
    const pageBId = addPage();

    moveField(pageAId, pageBId, fieldId, 0);

    const state = useBuilderStore.getState();
    expect(state.definition!.pages.find((p) => p.id === pageAId)!.fields).toHaveLength(0);
    expect(state.definition!.pages.find((p) => p.id === pageBId)!.fields).toHaveLength(1);
  });

  it("adds and removes pages, but never below one page", () => {
    const { addPage, removePage, definition } = useBuilderStore.getState();
    const firstPageId = definition!.pages[0]!.id;

    const secondPageId = addPage();
    expect(useBuilderStore.getState().definition!.pages).toHaveLength(2);

    removePage(secondPageId);
    expect(useBuilderStore.getState().definition!.pages).toHaveLength(1);

    removePage(firstPageId);
    expect(useBuilderStore.getState().definition!.pages).toHaveLength(1);
  });

  it("reorders pages", () => {
    const { addPage, definition, reorderPages } = useBuilderStore.getState();
    const pageAId = definition!.pages[0]!.id;
    const pageBId = addPage();

    reorderPages([pageBId, pageAId]);

    expect(useBuilderStore.getState().definition!.pages.map((p) => p.id)).toEqual([
      pageBId,
      pageAId,
    ]);
  });

  it("updates a page's title and description", () => {
    const { definition, updatePage } = useBuilderStore.getState();
    const pageId = definition!.pages[0]!.id;

    updatePage(pageId, { title: "Kontakt", description: "Deine Daten" });

    const page = useBuilderStore.getState().definition!.pages[0]!;
    expect(page.title).toBe("Kontakt");
    expect(page.description).toBe("Deine Daten");
  });

  it("updates form-level settings", () => {
    const { updateSettings } = useBuilderStore.getState();

    updateSettings({ progressDisplay: "steps", allowBack: false });

    const settings = useBuilderStore.getState().definition!.settings;
    expect(settings.progressDisplay).toBe("steps");
    expect(settings.allowBack).toBe(false);
  });

  it("undoes a settings change", () => {
    const { updateSettings } = useBuilderStore.getState();
    updateSettings({ progressDisplay: "steps" });

    useBuilderStore.getState().undo();

    expect(useBuilderStore.getState().definition!.settings.progressDisplay).toBe("bar");
  });

  it("updates theme tokens", () => {
    const { updateTheme } = useBuilderStore.getState();

    updateTheme({ colorPrimary: "#FF0000", fontSizeBase: 18 });

    const theme = useBuilderStore.getState().definition!.theme;
    expect(theme.colorPrimary).toBe("#FF0000");
    expect(theme.fontSizeBase).toBe(18);
  });

  it("duplicates a page with fresh IDs for the page and every field", () => {
    const { definition, addField, duplicatePage } = useBuilderStore.getState();
    const pageId = definition!.pages[0]!.id;
    const fieldId = addField(pageId, "short_text");

    duplicatePage(pageId);

    const pages = useBuilderStore.getState().definition!.pages;
    expect(pages).toHaveLength(2);
    expect(pages[1]!.id).not.toBe(pageId);
    expect(pages[1]!.fields[0]!.id).not.toBe(fieldId);
    expect(pages[1]!.fields).toHaveLength(1);
  });

  describe("conditions", () => {
    it("adds a condition with a generated id", () => {
      const { definition, addField } = useBuilderStore.getState();
      const pageId = definition!.pages[0]!.id;
      const fieldId = addField(pageId, "single_choice");

      const conditionId = useBuilderStore.getState().addCondition({
        logic: "and",
        rules: [{ fieldId, operator: "is_answered" }],
        action: "show_page",
        targetId: pageId,
      });

      const conditions = useBuilderStore.getState().definition!.conditions;
      expect(conditions).toHaveLength(1);
      expect(conditions[0]!.id).toBe(conditionId);
    });

    it("updates a condition", () => {
      const { definition, addField, updateCondition } = useBuilderStore.getState();
      const pageId = definition!.pages[0]!.id;
      const fieldId = addField(pageId, "short_text");
      const conditionId = useBuilderStore
        .getState()
        .addCondition({ logic: "and", rules: [{ fieldId, operator: "is_answered" }], action: "hide_field" });

      updateCondition(conditionId, { logic: "or" });

      expect(useBuilderStore.getState().definition!.conditions[0]!.logic).toBe("or");
    });

    it("removes a condition", () => {
      const { definition, addField, removeCondition } = useBuilderStore.getState();
      const pageId = definition!.pages[0]!.id;
      const fieldId = addField(pageId, "short_text");
      const conditionId = useBuilderStore
        .getState()
        .addCondition({ logic: "and", rules: [{ fieldId, operator: "is_answered" }], action: "hide_field" });

      removeCondition(conditionId);

      expect(useBuilderStore.getState().definition!.conditions).toHaveLength(0);
    });

    it("undoes adding a condition", () => {
      const { definition, addField } = useBuilderStore.getState();
      const pageId = definition!.pages[0]!.id;
      const fieldId = addField(pageId, "short_text");
      useBuilderStore
        .getState()
        .addCondition({ logic: "and", rules: [{ fieldId, operator: "is_answered" }], action: "hide_field" });

      useBuilderStore.getState().undo();

      expect(useBuilderStore.getState().definition!.conditions).toHaveLength(0);
    });
  });

  describe("undo/redo", () => {
    it("undoes and redoes a field addition", () => {
      const { definition, addField } = useBuilderStore.getState();
      const pageId = definition!.pages[0]!.id;

      addField(pageId, "short_text");
      expect(useBuilderStore.getState().definition!.pages[0]!.fields).toHaveLength(1);

      useBuilderStore.getState().undo();
      expect(useBuilderStore.getState().definition!.pages[0]!.fields).toHaveLength(0);

      useBuilderStore.getState().redo();
      expect(useBuilderStore.getState().definition!.pages[0]!.fields).toHaveLength(1);
    });

    it("undoes a text change", () => {
      const { definition, addField, updateField } = useBuilderStore.getState();
      const pageId = definition!.pages[0]!.id;
      const fieldId = addField(pageId, "short_text");
      updateField(pageId, fieldId, { label: "Changed" });

      useBuilderStore.getState().undo();

      const field = useBuilderStore.getState().definition!.pages[0]!.fields[0]!;
      expect("label" in field && field.label).toBe("Kurzer Text");
    });

    it("undoes a field removal and a field move", () => {
      const { definition, addField, removeField, addPage, moveField } =
        useBuilderStore.getState();
      const pageAId = definition!.pages[0]!.id;
      const fieldId = addField(pageAId, "short_text");
      const pageBId = addPage();

      moveField(pageAId, pageBId, fieldId, 0);
      useBuilderStore.getState().undo();
      expect(useBuilderStore.getState().definition!.pages.find((p) => p.id === pageAId)!.fields).toHaveLength(1);

      removeField(pageAId, fieldId);
      useBuilderStore.getState().undo();
      expect(useBuilderStore.getState().definition!.pages.find((p) => p.id === pageAId)!.fields).toHaveLength(1);
    });

    it("undoes a page addition", () => {
      const { addPage } = useBuilderStore.getState();
      addPage();
      expect(useBuilderStore.getState().definition!.pages).toHaveLength(2);

      useBuilderStore.getState().undo();
      expect(useBuilderStore.getState().definition!.pages).toHaveLength(1);
    });

    it("clears the redo stack once a new change is made", () => {
      const { definition, addField } = useBuilderStore.getState();
      const pageId = definition!.pages[0]!.id;

      addField(pageId, "short_text");
      useBuilderStore.getState().undo();
      expect(useBuilderStore.getState().canRedo()).toBe(true);

      addField(pageId, "email");
      expect(useBuilderStore.getState().canRedo()).toBe(false);
    });

    it("reports canUndo/canRedo correctly", () => {
      expect(useBuilderStore.getState().canUndo()).toBe(false);
      expect(useBuilderStore.getState().canRedo()).toBe(false);

      const { definition, addField } = useBuilderStore.getState();
      addField(definition!.pages[0]!.id, "short_text");
      expect(useBuilderStore.getState().canUndo()).toBe(true);

      useBuilderStore.getState().undo();
      expect(useBuilderStore.getState().canUndo()).toBe(false);
      expect(useBuilderStore.getState().canRedo()).toBe(true);
    });
  });
});
