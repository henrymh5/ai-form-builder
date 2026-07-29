import { describe, expect, it } from "vitest";
import { createEmptyFormDefinition } from "./factory";
import { migrateToLatest, UnknownSchemaVersionError } from "./migrations";

describe("migrateToLatest", () => {
  it("returns a validated, unchanged definition when already at the current version", () => {
    const def = createEmptyFormDefinition("Test");
    const result = migrateToLatest(def);
    expect(result.schemaVersion).toBe(def.schemaVersion);
    expect(result.metadata.title).toBe("Test");
  });

  it("defaults to version 1 when schemaVersion is missing (legacy fixture)", () => {
    const def = createEmptyFormDefinition("Legacy");
    const withoutVersion: Partial<typeof def> = { ...def };
    delete withoutVersion.schemaVersion;
    const result = migrateToLatest(withoutVersion);
    expect(result.schemaVersion).toBe(1);
  });

  it("throws UnknownSchemaVersionError for an unreachable future version", () => {
    const def = createEmptyFormDefinition("Future");
    expect(() => migrateToLatest({ ...def, schemaVersion: 999 })).toThrow(
      UnknownSchemaVersionError,
    );
  });
});
