import { CURRENT_SCHEMA_VERSION, formDefinitionSchema, type FormDefinition } from "./schema";

/**
 * Schema migration registry — plan §4.2. Each entry migrates a definition
 * from one schemaVersion to the next. `migrateToLatest` walks the chain and
 * validates the result. Currently empty (schema is at v1, the initial
 * version) — add an entry here whenever CURRENT_SCHEMA_VERSION increases,
 * with a fixture test using an old-version definition (plan §15).
 */
interface Migration {
  from: number;
  to: number;
  migrate(definition: Record<string, unknown>): Record<string, unknown>;
}

const MIGRATIONS: Migration[] = [
  // { from: 1, to: 2, migrate: (def) => ({ ...def, schemaVersion: 2, /* ... */ }) },
];

export class UnknownSchemaVersionError extends Error {
  constructor(version: number) {
    super(`Keine Migration für Formularschema-Version ${version} gefunden.`);
    this.name = "UnknownSchemaVersionError";
  }
}

/**
 * Migrates a raw (possibly outdated) form definition to the current schema
 * version, then validates it. Throws `UnknownSchemaVersionError` if no
 * migration path exists from the given version.
 */
export function migrateToLatest(raw: Record<string, unknown>): FormDefinition {
  let current = raw;
  let version = typeof raw.schemaVersion === "number" ? raw.schemaVersion : 1;

  if (version > CURRENT_SCHEMA_VERSION) {
    throw new UnknownSchemaVersionError(version);
  }

  while (version < CURRENT_SCHEMA_VERSION) {
    const migration = MIGRATIONS.find((m) => m.from === version);
    if (!migration) {
      throw new UnknownSchemaVersionError(version);
    }
    current = migration.migrate(current);
    version = migration.to;
  }

  return formDefinitionSchema.parse({ ...current, schemaVersion: CURRENT_SCHEMA_VERSION });
}
