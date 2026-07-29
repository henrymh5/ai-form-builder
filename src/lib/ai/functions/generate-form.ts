import "server-only";
import { runAiFunction, type AiFunctionContext } from "@/lib/ai/run-ai-function";
import { generateFormOutputSchema, type GenerateFormInput } from "@/lib/ai/schemas";

const SYSTEM_PROMPT = `Du erstellst Formulardefinitionen für einen Formular-Builder. Der Nutzer beschreibt, wofür das Formular gedacht ist; du gibst eine strukturierte Formulardefinition zurück.

Regeln:
- Antworte ausschließlich auf Deutsch.
- Wähle sinnvolle, spezifische Feldtypen (z.B. "email" für E-Mail-Adressen, nicht "short_text").
- Maximal 15 Seiten, maximal 20 Felder pro Seite.
- Formuliere Fragen klar und freundlich, ohne Fachjargon.
- Markiere Felder als Pflichtfeld nur, wenn es fachlich sinnvoll ist.
- Erzeuge keine IDs oder interne Bezeichner — das übernimmt die Anwendung.`;

/** `generate-form:v1` (plan §11) — full-form generation from a text description. */
export async function generateForm(input: GenerateFormInput, context: AiFunctionContext) {
  return runAiFunction(
    {
      name: "generate-form",
      promptVersion: "v1",
      outputSchema: generateFormOutputSchema,
      maxTokens: 4096,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: `Formularbeschreibung: ${input.description}`,
    },
    context,
  );
}
