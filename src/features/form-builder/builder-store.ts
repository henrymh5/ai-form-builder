import { create } from "zustand";
import { generateId } from "@/lib/form-schema/ids";
import type { Field, FieldType } from "@/lib/form-schema/fields";
import type { Settings } from "@/lib/form-schema/settings";
import type { Theme } from "@/lib/form-schema/theme";
import type { Condition } from "@/lib/form-schema/conditions";
import type { FormDefinition, Page } from "@/lib/form-schema/schema";

/**
 * Builder Store (plan §23 "Builder Store"): the single client-side owner of
 * the form definition being edited, the current selection, and undo/redo
 * history (plan §6 "Command- oder Snapshot-basiertes History-System" — this
 * uses the snapshot approach: every mutation pushes the PREVIOUS definition
 * onto `past` before applying the change). React Hook Form and TanStack
 * Query are deliberately NOT used here — this is exactly the state they're
 * not meant to own (plan §23).
 */

export type SelectedElement =
  { kind: "field"; pageId: string; fieldId: string } | { kind: "page"; pageId: string } | null;

const MAX_HISTORY = 50;

interface BuilderState {
  definition: FormDefinition | null;
  selected: SelectedElement;
  currentPageId: string | null;
  past: FormDefinition[];
  future: FormDefinition[];

  loadDefinition: (definition: FormDefinition) => void;
  selectField: (pageId: string, fieldId: string) => void;
  selectPage: (pageId: string) => void;
  clearSelection: () => void;
  setCurrentPage: (pageId: string) => void;

  addField: (pageId: string, type: FieldType, atIndex?: number) => string;
  updateField: (pageId: string, fieldId: string, patch: Partial<Field>) => void;
  removeField: (pageId: string, fieldId: string) => void;
  duplicateField: (pageId: string, fieldId: string) => void;
  moveField: (fromPageId: string, toPageId: string, fieldId: string, toIndex: number) => void;
  toggleRequired: (pageId: string, fieldId: string) => void;

  addPage: () => string;
  removePage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;
  reorderPages: (pageIds: string[]) => void;
  updatePage: (pageId: string, patch: Partial<Pick<Page, "title" | "description">>) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  updateTheme: (patch: Partial<Theme>) => void;

  addCondition: (condition: Omit<Condition, "id">) => string;
  updateCondition: (conditionId: string, patch: Partial<Omit<Condition, "id">>) => void;
  removeCondition: (conditionId: string) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const DEFAULT_LABEL_BY_TYPE: Record<FieldType, string> = {
  short_text: "Kurzer Text",
  long_text: "Langer Text",
  email: "E-Mail",
  phone: "Telefonnummer",
  url: "URL",
  number: "Zahl",
  date: "Datum",
  time: "Uhrzeit",
  single_choice: "Einfachauswahl",
  multiple_choice: "Mehrfachauswahl",
  dropdown: "Dropdown",
  yes_no: "Ja/Nein",
  rating: "Bewertung",
  star_rating: "Sternebewertung",
  nps: "NPS-Skala",
  file_upload: "Datei-Upload",
  consent: "Einwilligung",
  hidden: "Verstecktes Feld",
  heading: "Überschrift",
  paragraph: "Beschreibungstext",
  divider: "Trennbereich",
};

function defaultKeyFor(type: FieldType, definition: FormDefinition): string {
  const base = type.replace(/[^a-z]/g, "_");
  const existingKeys = new Set(
    definition.pages.flatMap((p) => p.fields).map((f) => ("key" in f ? f.key : null)),
  );
  let n = 1;
  let key = `${base}_${n}`;
  while (existingKeys.has(key)) {
    n += 1;
    key = `${base}_${n}`;
  }
  return key;
}

/** Builds a new field of `type` with sensible defaults — mirrors fields.ts's discriminated union. */
function createField(type: FieldType, definition: FormDefinition): Field {
  const id = generateId("field");
  const label = DEFAULT_LABEL_BY_TYPE[type];

  switch (type) {
    case "heading":
      return { id, type, label };
    case "paragraph":
      return { id, type, label };
    case "divider":
      return { id, type };
    case "single_choice":
    case "multiple_choice":
    case "dropdown":
      return {
        id,
        type,
        key: defaultKeyFor(type, definition),
        label,
        required: false,
        options: [
          { id: generateId("option"), label: "Option 1", value: "option_1" },
          { id: generateId("option"), label: "Option 2", value: "option_2" },
        ],
      };
    case "rating":
    case "star_rating":
      return {
        id,
        type,
        key: defaultKeyFor(type, definition),
        label,
        required: false,
        maxRating: 5,
      };
    default:
      return {
        id,
        type,
        key: defaultKeyFor(type, definition),
        label,
        required: false,
      } as Field;
  }
}

/**
 * Deep-clones a field/page with entirely new IDs (plan §6 "Beim Duplizieren
 * müssen neue interne IDs erzeugt werden"). Used for both single-field and
 * whole-page duplication so neither path can ever reuse a source ID.
 */
function cloneFieldWithNewIds(field: Field): Field {
  const clone: Field = { ...field, id: generateId("field") } as Field;
  if ("key" in clone) {
    (clone as { key: string }).key = `${(field as { key: string }).key}_copy`;
  }
  if ("options" in clone) {
    (clone as { options: { id: string; label: string; value: string }[] }).options = (
      field as { options: { id: string; label: string; value: string }[] }
    ).options.map((o) => ({ ...o, id: generateId("option") }));
  }
  return clone;
}

function withPages(definition: FormDefinition, pages: Page[]): FormDefinition {
  return { ...definition, pages };
}

export const useBuilderStore = create<BuilderState>((set, get) => {
  /** Applies `next` as the new definition, snapshotting the current one for undo. */
  function commitDefinition(
    next: FormDefinition,
    extra?: Partial<Pick<BuilderState, "selected" | "currentPageId">>,
  ) {
    const { definition, past } = get();
    if (!definition) return;
    const nextPast = [...past, definition].slice(-MAX_HISTORY);
    set({ definition: next, past: nextPast, future: [], ...extra });
  }

  /** Applies `pages` as the new definition, snapshotting the current one for undo. */
  function commit(
    pages: Page[],
    extra?: Partial<Pick<BuilderState, "selected" | "currentPageId">>,
  ) {
    const { definition } = get();
    if (!definition) return;
    commitDefinition(withPages(definition, pages), extra);
  }

  return {
    definition: null,
    selected: null,
    currentPageId: null,
    past: [],
    future: [],

    loadDefinition: (definition) =>
      set({
        definition,
        currentPageId: definition.pages[0]?.id ?? null,
        selected: null,
        past: [],
        future: [],
      }),

    selectField: (pageId, fieldId) => set({ selected: { kind: "field", pageId, fieldId } }),
    selectPage: (pageId) => set({ selected: { kind: "page", pageId } }),
    clearSelection: () => set({ selected: null }),
    setCurrentPage: (pageId) => set({ currentPageId: pageId, selected: null }),

    addField: (pageId, type, atIndex) => {
      const { definition } = get();
      if (!definition) return "";
      const field = createField(type, definition);

      const pages = definition.pages.map((page) => {
        if (page.id !== pageId) return page;
        const fields = [...page.fields];
        const index = atIndex ?? fields.length;
        fields.splice(index, 0, field);
        return { ...page, fields };
      });

      commit(pages, { selected: { kind: "field", pageId, fieldId: field.id } });
      return field.id;
    },

    updateField: (pageId, fieldId, patch) => {
      const { definition } = get();
      if (!definition) return;
      const pages = definition.pages.map((page) => {
        if (page.id !== pageId) return page;
        return {
          ...page,
          fields: page.fields.map((f) => (f.id === fieldId ? ({ ...f, ...patch } as Field) : f)),
        };
      });
      commit(pages);
    },

    removeField: (pageId, fieldId) => {
      const { definition, selected } = get();
      if (!definition) return;
      const pages = definition.pages.map((page) =>
        page.id !== pageId
          ? page
          : { ...page, fields: page.fields.filter((f) => f.id !== fieldId) },
      );
      const stillSelected = selected?.kind === "field" && selected.fieldId === fieldId;
      commit(pages, { selected: stillSelected ? null : selected });
    },

    duplicateField: (pageId, fieldId) => {
      const { definition } = get();
      if (!definition) return;
      const pages = definition.pages.map((page) => {
        if (page.id !== pageId) return page;
        const index = page.fields.findIndex((f) => f.id === fieldId);
        if (index === -1) return page;
        const copy = cloneFieldWithNewIds(page.fields[index]!);
        const fields = [...page.fields];
        fields.splice(index + 1, 0, copy);
        return { ...page, fields };
      });
      commit(pages);
    },

    moveField: (fromPageId, toPageId, fieldId, toIndex) => {
      const { definition } = get();
      if (!definition) return;

      let moved: Field | undefined;
      const withoutField = definition.pages.map((page) => {
        if (page.id !== fromPageId) return page;
        const idx = page.fields.findIndex((f) => f.id === fieldId);
        if (idx === -1) return page;
        moved = page.fields[idx];
        const fields = [...page.fields];
        fields.splice(idx, 1);
        return { ...page, fields };
      });
      if (!moved) return;

      const finalPages = withoutField.map((page) => {
        if (page.id !== toPageId) return page;
        const fields = [...page.fields];
        fields.splice(Math.min(toIndex, fields.length), 0, moved!);
        return { ...page, fields };
      });

      commit(finalPages);
    },

    toggleRequired: (pageId, fieldId) => {
      const { definition } = get();
      if (!definition) return;
      const pages = definition.pages.map((page) => {
        if (page.id !== pageId) return page;
        return {
          ...page,
          fields: page.fields.map((f) =>
            f.id === fieldId && "required" in f ? { ...f, required: !f.required } : f,
          ),
        };
      });
      commit(pages);
    },

    addPage: () => {
      const { definition } = get();
      if (!definition) return "";
      const newPage: Page = { id: generateId("page"), fields: [] };
      commit([...definition.pages, newPage], { currentPageId: newPage.id, selected: null });
      return newPage.id;
    },

    removePage: (pageId) => {
      const { definition, currentPageId } = get();
      if (!definition || definition.pages.length <= 1) return;
      const pages = definition.pages.filter((p) => p.id !== pageId);
      commit(pages, {
        currentPageId: currentPageId === pageId ? (pages[0]?.id ?? null) : currentPageId,
        selected: null,
      });
    },

    /** Whole-page duplication (plan §6 "komplette Seiten") — every field gets a fresh ID. */
    duplicatePage: (pageId) => {
      const { definition } = get();
      if (!definition) return;
      const index = definition.pages.findIndex((p) => p.id === pageId);
      if (index === -1) return;
      const source = definition.pages[index]!;
      const copy: Page = {
        ...source,
        id: generateId("page"),
        fields: source.fields.map(cloneFieldWithNewIds),
      };
      const pages = [...definition.pages];
      pages.splice(index + 1, 0, copy);
      commit(pages, { currentPageId: copy.id, selected: null });
    },

    reorderPages: (pageIds) => {
      const { definition } = get();
      if (!definition) return;
      const byId = new Map(definition.pages.map((p) => [p.id, p]));
      const pages = pageIds.map((id) => byId.get(id)).filter((p): p is Page => p !== undefined);
      commit(pages);
    },

    updatePage: (pageId, patch) => {
      const { definition } = get();
      if (!definition) return;
      const pages = definition.pages.map((page) =>
        page.id === pageId ? { ...page, ...patch } : page,
      );
      commit(pages);
    },

    updateSettings: (patch) => {
      const { definition } = get();
      if (!definition) return;
      commitDefinition({ ...definition, settings: { ...definition.settings, ...patch } });
    },

    updateTheme: (patch) => {
      const { definition } = get();
      if (!definition) return;
      commitDefinition({ ...definition, theme: { ...definition.theme, ...patch } });
    },

    addCondition: (condition) => {
      const { definition } = get();
      if (!definition) return "";
      const newCondition: Condition = { ...condition, id: generateId("condition") };
      commitDefinition({ ...definition, conditions: [...definition.conditions, newCondition] });
      return newCondition.id;
    },

    updateCondition: (conditionId, patch) => {
      const { definition } = get();
      if (!definition) return;
      commitDefinition({
        ...definition,
        conditions: definition.conditions.map((c) =>
          c.id === conditionId ? { ...c, ...patch } : c,
        ),
      });
    },

    removeCondition: (conditionId) => {
      const { definition } = get();
      if (!definition) return;
      commitDefinition({
        ...definition,
        conditions: definition.conditions.filter((c) => c.id !== conditionId),
      });
    },

    undo: () => {
      const { past, definition, future } = get();
      if (past.length === 0 || !definition) return;
      const previous = past[past.length - 1]!;
      set({
        definition: previous,
        past: past.slice(0, -1),
        future: [definition, ...future].slice(0, MAX_HISTORY),
        selected: null,
      });
    },

    redo: () => {
      const { future, definition, past } = get();
      if (future.length === 0 || !definition) return;
      const next = future[0]!;
      set({
        definition: next,
        future: future.slice(1),
        past: [...past, definition].slice(-MAX_HISTORY),
        selected: null,
      });
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,
  };
});
