# validation

Übersetzt die deklarativen `ValidationRule`-Objekte des Formschemas in
Zod-Runtime-Schemata für Antwortwerte (Masterplan §2.3 / §4.3).

**Es gibt genau eine Implementierung**, die sowohl vom Client (React Hook
Form Resolver im Renderer) als auch vom Server (Submission-Revalidierung)
verwendet wird — niemals zwei getrennte Validierungspfade.

- `compile-field.ts` — `compileFieldValidation(field)` kompiliert ein
  einzelnes Feld in ein Zod-Schema für seinen Antwortwert. Gibt `undefined`
  für reine Anzeige-Feldtypen (heading/paragraph/divider) zurück.
- `compile-page.ts` — `compilePageSchema(fields)` baut ein Zod-Objekt-Schema
  über mehrere Felder, keyed by `field.key`.
