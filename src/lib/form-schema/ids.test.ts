import { describe, expect, it } from "vitest";
import { generateId, isValidId } from "./ids";

describe("generateId", () => {
  it("prefixes IDs by kind", () => {
    expect(generateId("page")).toMatch(/^pg_/);
    expect(generateId("field")).toMatch(/^fld_/);
    expect(generateId("option")).toMatch(/^opt_/);
    expect(generateId("condition")).toMatch(/^cnd_/);
    expect(generateId("ending")).toMatch(/^end_/);
  });

  it("generates unique IDs across many calls", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generateId("field")));
    expect(ids.size).toBe(1000);
  });

  it("round-trips through isValidId", () => {
    expect(isValidId("field", generateId("field"))).toBe(true);
    expect(isValidId("field", generateId("page"))).toBe(false);
    expect(isValidId("page", "not-an-id")).toBe(false);
  });
});
