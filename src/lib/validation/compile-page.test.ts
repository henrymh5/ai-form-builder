import { describe, expect, it } from "vitest";
import { generateId } from "@/lib/form-schema/ids";
import type { Field } from "@/lib/form-schema/schema";
import { compilePageSchema } from "./compile-page";

describe("compilePageSchema", () => {
  it("keys the compiled schema by field.key and skips display-only fields", () => {
    const fields: Field[] = [
      { id: generateId("field"), key: "name", label: "Name", required: true, type: "short_text" },
      { id: generateId("field"), label: "Überschrift", type: "heading" },
      { id: generateId("field"), key: "age", label: "Alter", required: false, type: "number" },
    ];

    const schema = compilePageSchema(fields);
    expect(Object.keys(schema.shape)).toEqual(["name", "age"]);

    expect(schema.safeParse({ name: "Max" }).success).toBe(true);
    expect(schema.safeParse({ name: "" }).success).toBe(false);
  });
});
