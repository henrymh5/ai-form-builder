import { describe, expect, it } from "vitest";
import { generateId } from "@/lib/form-schema/ids";
import type { Field } from "@/lib/form-schema/schema";
import { compileFieldValidation } from "./compile-field";

function field(overrides: Partial<Field> & Pick<Field, "type">): Field {
  const base = {
    id: generateId("field"),
    key: "test_field",
    label: "Test",
    required: false,
  };
  return { ...base, ...overrides } as Field;
}

describe("compileFieldValidation — short_text", () => {
  it("enforces minLength/maxLength", () => {
    const schema = compileFieldValidation(
      field({ type: "short_text", validation: { minLength: 3, maxLength: 5 } }),
    )!;
    expect(schema.safeParse("ab").success).toBe(false);
    expect(schema.safeParse("abc").success).toBe(true);
    expect(schema.safeParse("abcdef").success).toBe(false);
  });

  it("enforces a custom pattern", () => {
    const schema = compileFieldValidation(
      field({ type: "short_text", validation: { pattern: "^[A-Z]+$" } }),
    )!;
    expect(schema.safeParse("ABC").success).toBe(true);
    expect(schema.safeParse("abc").success).toBe(false);
  });

  it("is optional when not required", () => {
    const schema = compileFieldValidation(field({ type: "short_text", required: false }))!;
    expect(schema.safeParse(undefined).success).toBe(true);
  });

  it("rejects empty string when required", () => {
    const schema = compileFieldValidation(field({ type: "short_text", required: true }))!;
    expect(schema.safeParse("").success).toBe(false);
    expect(schema.safeParse("x").success).toBe(true);
  });
});

describe("compileFieldValidation — email", () => {
  it("validates email format", () => {
    const schema = compileFieldValidation(field({ type: "email", required: true }))!;
    expect(schema.safeParse("not-an-email").success).toBe(false);
    expect(schema.safeParse("a@b.de").success).toBe(true);
  });
});

describe("compileFieldValidation — url", () => {
  it("validates URL format", () => {
    const schema = compileFieldValidation(field({ type: "url", required: true }))!;
    expect(schema.safeParse("not a url").success).toBe(false);
    expect(schema.safeParse("https://example.com").success).toBe(true);
  });
});

describe("compileFieldValidation — number", () => {
  it("enforces min/max/integer", () => {
    const schema = compileFieldValidation(
      field({ type: "number", validation: { min: 10, max: 20, integer: true } }),
    )!;
    expect(schema.safeParse(5).success).toBe(false);
    expect(schema.safeParse(15).success).toBe(true);
    expect(schema.safeParse(25).success).toBe(false);
    expect(schema.safeParse(15.5).success).toBe(false);
  });
});

describe("compileFieldValidation — choice fields", () => {
  const options = [
    { id: generateId("option"), label: "Klein", value: "small" },
    { id: generateId("option"), label: "Groß", value: "large" },
  ];

  it("single_choice only accepts declared option values", () => {
    const schema = compileFieldValidation(
      field({ type: "single_choice", options, required: true }),
    )!;
    expect(schema.safeParse("small").success).toBe(true);
    expect(schema.safeParse("medium").success).toBe(false);
  });

  it("multiple_choice enforces min/max selections", () => {
    const schema = compileFieldValidation(
      field({
        type: "multiple_choice",
        options,
        validation: { minSelections: 1, maxSelections: 1 },
      }),
    )!;
    expect(schema.safeParse([]).success).toBe(false);
    expect(schema.safeParse(["small"]).success).toBe(true);
    expect(schema.safeParse(["small", "large"]).success).toBe(false);
  });
});

describe("compileFieldValidation — rating/nps", () => {
  it("bounds rating to maxRating", () => {
    const schema = compileFieldValidation(field({ type: "rating", maxRating: 5 }))!;
    expect(schema.safeParse(0).success).toBe(false);
    expect(schema.safeParse(5).success).toBe(true);
    expect(schema.safeParse(6).success).toBe(false);
  });

  it("bounds NPS to 0-10", () => {
    const schema = compileFieldValidation(field({ type: "nps" }))!;
    expect(schema.safeParse(-1).success).toBe(false);
    expect(schema.safeParse(10).success).toBe(true);
    expect(schema.safeParse(11).success).toBe(false);
  });
});

describe("compileFieldValidation — file_upload", () => {
  it("enforces maxFiles", () => {
    const schema = compileFieldValidation(
      field({ type: "file_upload", validation: { maxFiles: 2 } }),
    )!;
    expect(schema.safeParse(["a"]).success).toBe(true);
    expect(schema.safeParse(["a", "b", "c"]).success).toBe(false);
  });
});

describe("compileFieldValidation — consent", () => {
  it("requires exactly true when required", () => {
    const schema = compileFieldValidation(field({ type: "consent", required: true }))!;
    expect(schema.safeParse(true).success).toBe(true);
    expect(schema.safeParse(false).success).toBe(false);
  });
});

describe("compileFieldValidation — display-only fields", () => {
  it("returns undefined for heading/paragraph/divider", () => {
    expect(
      compileFieldValidation({ id: generateId("field"), type: "heading", label: "X" }),
    ).toBeUndefined();
    expect(
      compileFieldValidation({ id: generateId("field"), type: "paragraph", label: "X" }),
    ).toBeUndefined();
    expect(compileFieldValidation({ id: generateId("field"), type: "divider" })).toBeUndefined();
  });
});
