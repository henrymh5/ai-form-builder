import "server-only";
import { runAiFunction, type AiFunctionContext } from "@/lib/ai/run-ai-function";
import { rewriteQuestionOutputSchema, type RewriteQuestionInput } from "@/lib/ai/schemas";

const STYLE_INSTRUCTION: Record<RewriteQuestionInput["style"], string> = {
  reword: "Formuliere die Frage um, ohne die Bedeutung zu verändern.",
  shorten: "Kürze die Frage so weit wie möglich, ohne die Bedeutung zu verändern.",
  friendlier: "Formuliere die Frage freundlicher und einladender.",
};

/**
 * `rewrite-question:v1` (plan §11 "Frage umformulieren/kürzen/freundlicher
 * formulieren") — a separate, narrow endpoint so editing one field never
 * requires resending the whole form to Claude (plan §11 "Teilweise
 * Neugenerierung").
 */
export async function rewriteQuestion(input: RewriteQuestionInput, context: AiFunctionContext) {
  return runAiFunction(
    {
      name: "rewrite-question",
      promptVersion: "v1",
      outputSchema: rewriteQuestionOutputSchema,
      maxTokens: 512,
      systemPrompt: `Du formulierst einzelne Formularfragen um. ${STYLE_INSTRUCTION[input.style]} Antworte ausschließlich auf Deutsch.`,
      userPrompt: `Frage: "${input.label}"${input.description ? `\nBeschreibung: "${input.description}"` : ""}`,
    },
    context,
  );
}
