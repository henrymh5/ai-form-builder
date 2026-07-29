import "server-only";
import { runAiFunction, type AiFunctionContext } from "@/lib/ai/run-ai-function";
import { generateOptionsOutputSchema, type GenerateOptionsInput } from "@/lib/ai/schemas";

/** `generate-options:v1` (plan §11 "Antwortoptionen vorschlagen"). */
export async function generateOptions(
  input: GenerateOptionsInput,
  context: AiFunctionContext,
) {
  return runAiFunction(
    {
      name: "generate-options",
      promptVersion: "v1",
      outputSchema: generateOptionsOutputSchema,
      maxTokens: 512,
      systemPrompt:
        "Du schlägst Antwortoptionen für eine Auswahlfrage in einem Formular vor. Antworte ausschließlich auf Deutsch. Die Optionen müssen sich gegenseitig ausschließen und den plausiblen Antwortraum abdecken.",
      userPrompt: `Frage: "${input.label}"\nAnzahl gewünschter Optionen: ${input.count}`,
    },
    context,
  );
}
