/**
 * CSV serialization (plan §14/§25 "CSV-Formula-Injection-Schutz"). Pure,
 * no I/O — used by the export route and covered by unit tests directly.
 */

const FORMULA_TRIGGER_CHARS = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Escapes a single CSV field: quotes when the value contains a comma, quote,
 * or newline, and — the actual security-relevant part — prefixes a leading
 * `'` when the value starts with a character a spreadsheet would interpret
 * as a formula (`=`, `+`, `-`, `@`, tab, CR), so a malicious answer like
 * `=cmd|'/c calc'!A1` can never execute when the file is opened in Excel/
 * Sheets/LibreOffice.
 */
export function escapeCsvField(value: string): string {
  const needsFormulaGuard = FORMULA_TRIGGER_CHARS.some((char) => value.startsWith(char));
  const guarded = needsFormulaGuard ? `'${value}` : value;

  const needsQuoting = /[",\n\r]/.test(guarded);
  if (!needsQuoting) return guarded;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export function toCsvValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "boolean") return value ? "Ja" : "Nein";
  if (Array.isArray(value)) return value.map((v) => String(v)).join("; ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Builds a full CSV document from column headers + rows. Prepends a UTF-8
 * BOM so Excel on Windows detects the encoding correctly (plan §21 "Datei
 * öffnet korrekt (UTF-8, Spalten, keine Formel-Ausführung)"). Uses CRLF line
 * endings per the CSV convention most spreadsheet tools expect.
 */
export function buildCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}
