import { describe, expect, it } from "vitest";
import { buildCsv, escapeCsvField, toCsvValue } from "./serialize";

describe("escapeCsvField", () => {
  it("passes plain values through unchanged", () => {
    expect(escapeCsvField("Grace Hopper")).toBe("Grace Hopper");
  });

  it("quotes values containing a comma", () => {
    expect(escapeCsvField("Berlin, Germany")).toBe('"Berlin, Germany"');
  });

  it("quotes values containing a double quote and doubles it", () => {
    expect(escapeCsvField('She said "hi"')).toBe('"She said ""hi"""');
  });

  it("quotes values containing a newline", () => {
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
  });

  it.each([["=cmd|'/c calc'!A1"], ["+1+1"], ["-1+1"], ["@SUM(A1:A9)"], ["\ttab"], ["\rcr"]])(
    "prefixes a leading apostrophe for formula-injection payload %s",
    (payload) => {
      const result = escapeCsvField(payload);
      expect(result.replace(/^"/, "")).toMatch(/^'/);
    },
  );

  it("does not treat a mid-string formula character as dangerous", () => {
    expect(escapeCsvField("total=5")).toBe("total=5");
  });
});

describe("toCsvValue", () => {
  it("renders undefined/null as an empty string", () => {
    expect(toCsvValue(undefined)).toBe("");
    expect(toCsvValue(null)).toBe("");
  });

  it("renders booleans in German", () => {
    expect(toCsvValue(true)).toBe("Ja");
    expect(toCsvValue(false)).toBe("Nein");
  });

  it("joins arrays with a semicolon separator", () => {
    expect(toCsvValue(["a", "b", "c"])).toBe("a; b; c");
  });

  it("stringifies plain objects as JSON", () => {
    expect(toCsvValue({ x: 1 })).toBe('{"x":1}');
  });

  it("stringifies numbers and strings directly", () => {
    expect(toCsvValue(42)).toBe("42");
    expect(toCsvValue("hi")).toBe("hi");
  });
});

describe("buildCsv", () => {
  it("prepends a UTF-8 BOM", () => {
    const csv = buildCsv(["a"], [["1"]]);
    expect(csv.codePointAt(0)).toBe(0xfeff);
  });

  it("joins headers and rows with CRLF", () => {
    const csv = buildCsv(["Name", "Alter"], [["Ada", "30"]]);
    expect(csv).toBe("﻿Name,Alter\r\nAda,30\r\n");
  });

  it("escapes formula-injection payloads in data rows", () => {
    const csv = buildCsv(["Antwort"], [["=cmd|'/c calc'!A1"]]);
    expect(csv).toContain("'=cmd");
  });
});
