# logic-engine

Zentrale Conditional-Logic-Engine (Masterplan §9). Reine TypeScript-Module
ohne React/IO — deterministisch, von Builder, Vorschau, öffentlichem
Renderer, Server und Tests identisch genutzt.

- `evaluate.ts` — `evaluateRule`/`evaluateCondition`: Operator-Auswertung je
  Datentyp, AND/OR-Kombination. Ein Regelverweis auf ein unbeantwortetes
  oder gelöschtes Feld wirft nie, sondern erfüllt nur `is_not_answered`.
- `visibility.ts` — `getFieldVisibility`/`getPageVisibility`: Sichtbarkeit
  aus allen Bedingungen. Bei widersprüchlichen Regeln gewinnt `hide` gegen
  `show` (Sicherheitsdefault). `pruneHiddenAnswers` entfernt Antworten nicht
  mehr sichtbarer Felder bis zum Fixpunkt (Kaskaden).
- `navigation.ts` — `getNextStep`: Priorität `end_form` > `jump_to_page`
  (jeweils erste zutreffende Regel in Array-Reihenfolge) > nächste sichtbare
  Seite > Default-Ending. `getReachablePages`/`computeProgress` simulieren
  den tatsächlichen Pfad für eine gegebene Antwortmenge (dynamischer
  Fortschritt, Spec §7). Laufzeit-Schutzzähler gegen Endlosschleifen.
- `graph.ts` — statische Analysen über alle möglichen Antwortkombinationen
  hinweg (für den Publish-Gate, bevor konkrete Antworten existieren):
  `detectCycles` (pessimistisch — jede mögliche Schleife zählt),
  `findUnreachablePages`/`findPathsWithoutEnding` (optimistisch/heuristisch —
  nur beweisbare Fälle, siehe Modul-Kommentar zur Einschränkung),
  `validateReferences`.
- `wire-validation.ts` — `logicEngineGraphAnalysis`: konkrete
  `GraphAnalysis`-Implementierung für `lib/form-schema/validate.ts`
  (`validateFormDefinition(def, logicEngineGraphAnalysis)`).
