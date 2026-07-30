import "server-only";
import { runAiFunction, type AiFunctionContext } from "@/lib/ai/run-ai-function";
import {
  generateWorkflowOutputSchema,
  type GenerateWorkflowInput,
} from "@/lib/ai/workflow-schemas";
import type { FormDefinition } from "@/lib/form-schema/schema";
import { isAnswerableField } from "@/lib/form-schema/fields";

const SYSTEM_PROMPT = `Du erstellst Automatisierungs-Workflows für einen Formular-Builder. Der Nutzer beschreibt, was bei einer neuen Formularantwort automatisch passieren soll; du gibst einen strukturierten Workflow-Graphen zurück.

Regeln:
- Antworte ausschließlich auf Deutsch.
- Der Workflow beginnt implizit mit dem Trigger "Neue Antwort" — du erzeugst NUR die Knoten danach (Bedingungen und Aktionen), nicht den Trigger selbst.
- Referenziere Formularfelder ausschließlich über ihr sichtbares Label (fieldLabel/submitterFieldLabel), niemals über eine ID — verwende dabei exakt eines der unten aufgeführten Labels.
- Jeder Knoten braucht eine kurze, eindeutige lokale Referenz (ref), z. B. "n1", "n2" — keine echten IDs.
- Kanten (edges) verbinden diese ref-Werte; bei Bedingungsknoten gib "branch": "true" oder "false" an, sonst lass "branch" weg.
- Maximal 15 Knoten, maximal 10 Bedingungen pro Bedingungsknoten.
- Erzeuge nur sinnvolle, tatsächlich ausführbare Workflows basierend auf der Beschreibung — keine Spekulation über nicht vorhandene Felder.`;

function describeForm(form: FormDefinition): string {
  const fields = form.pages.flatMap((p) => p.fields).filter(isAnswerableField);
  const fieldLines = fields
    .map((f) => ("label" in f ? `- ${f.label} (${f.type})` : null))
    .filter(Boolean)
    .join("\n");
  return `Formular: ${form.metadata.title}\n\nVerfügbare Felder:\n${fieldLines}`;
}

/** `generate-workflow:v1` (plan §11 prompt versioning) — generates a workflow graph from a text description. */
export async function generateWorkflow(
  input: GenerateWorkflowInput,
  form: FormDefinition,
  context: AiFunctionContext,
) {
  return runAiFunction(
    {
      name: "generate-workflow",
      promptVersion: "v1",
      outputSchema: generateWorkflowOutputSchema,
      maxTokens: 4096,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: `${describeForm(form)}\n\nGewünschter Workflow: ${input.description}`,
    },
    context,
  );
}
