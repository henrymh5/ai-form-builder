# form-schema

Kanonisches Zod-Schema für Formulardefinitionen (Masterplan §4). Einzige
Quelle der Wahrheit für Builder, Renderer, Server-Validierung und
KI-Ausgaben.

- `schema.ts` — `formDefinitionSchema` (Metadaten, Settings, Theme, Seiten,
  Bedingungen, Endings) + `CURRENT_SCHEMA_VERSION`.
- `fields.ts` — 21 Feldtypen als Discriminated Union, typspezifische
  Validierungs-Shapes.
- `conditions.ts` — Operatoren, Regeln, Aktionen, Ziel-Referenzen.
- `pages.ts` — Seiten- und Ending-Schema.
- `settings.ts`, `theme.ts` — Formular-Settings und Theme-Tokens.
- `ids.ts` — einzige Stelle, die IDs erzeugt (`generateId`), nie von der KI
  oder blind aus einer kopierten Definition übernommen.
- `clone.ts` — Duplizieren von Formular/Seite/Feld mit frischen IDs und
  konsistent umgeschriebenen Referenzen in Bedingungen.
- `migrations.ts` — Schema-Versionierung (`migrateToLatest`); aktuell leer,
  da Schema bei v1 ist — neue Einträge bei jeder Versionserhöhung.
- `validate.ts` — fachliche Domain-Validierung (`validateFormDefinition`)
  zusätzlich zur Zod-Formprüfung: Limits, Eindeutigkeit, Referenzen,
  Default-Ending. Zyklen-/Erreichbarkeitsprüfung wird über das
  `GraphAnalysis`-Interface angebunden, sobald die Logic Engine (Phase 2)
  existiert.
- `factory.ts` — `createEmptyFormDefinition` für „leeres Formular".
- `fixtures/` — Beispieldefinitionen für Tests (`webagentur-anfrage.ts`).
