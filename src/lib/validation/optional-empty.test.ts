import { describe, expect, it } from "vitest";
import { compileFieldValidation } from "@/lib/validation/compile-field";
import type { Field } from "@/lib/form-schema/schema";

const base = { id: "fld_1", key: "k", label: "L" };

describe("optional fields accept an empty submission", () => {
  it("optional date accepts empty string", () => {
    const s = compileFieldValidation({ ...base, type: "date", required: false } as Field)!;
    expect(s.safeParse("").success).toBe(true);
    expect(s.safeParse(undefined).success).toBe(true);
    expect(s.safeParse("2026-07-30").success).toBe(true);
  });
  it("required date still rejects empty", () => {
    const s = compileFieldValidation({ ...base, type: "date", required: true } as Field)!;
    expect(s.safeParse("").success).toBe(false);
  });
  it("optional time accepts empty string", () => {
    const s = compileFieldValidation({ ...base, type: "time", required: false } as Field)!;
    expect(s.safeParse("").success).toBe(true);
  });
  it("optional short_text accepts empty string", () => {
    const s = compileFieldValidation({ ...base, type: "short_text", required: false } as Field)!;
    expect(s.safeParse("").success).toBe(true);
  });
  it("file_upload takes an array of references, not a File", () => {
    const s = compileFieldValidation({ ...base, type: "file_upload", required: false } as Field)!;
    expect(s.safeParse([]).success).toBe(true);
    expect(s.safeParse(["a.pdf"]).success).toBe(true);
  });
});
