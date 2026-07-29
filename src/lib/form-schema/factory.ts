import { CURRENT_SCHEMA_VERSION, type FormDefinition } from "./schema";
import { generateId } from "./ids";
import { settingsSchema } from "./settings";
import { themeSchema } from "./theme";

/** Creates a minimal, valid empty form definition — used by "leeres Formular" (plan §3 Schritt 2). */
export function createEmptyFormDefinition(title: string): FormDefinition {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    metadata: { title, language: "de" },
    settings: settingsSchema.parse({}),
    theme: themeSchema.parse({}),
    pages: [{ id: generateId("page"), fields: [] }],
    conditions: [],
    endings: [{ id: generateId("ending"), title: "Vielen Dank!", isDefault: true }],
  };
}
