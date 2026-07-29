import "server-only";
import { z } from "zod";
import { runAiFunction, type AiFunctionContext } from "@/lib/ai/run-ai-function";

/** `workflow-ai-action:v1` — used by the "aiAction" workflow node (summarize/classify/translate a response). */
export const workflowAiActionOutputSchema = z.object({
  result: z.string().max(2000),
});
export type WorkflowAiActionOutput = z.infer<typeof workflowAiActionOutputSchema>;

export interface WorkflowAiActionInput {
  task: "summarize" | "classify" | "translate";
  categories?: string[];
  targetLanguage?: string;
  formTitle: string;
  answersText: string;
}

const TASK_INSTRUCTIONS: Record<WorkflowAiActionInput["task"], (input: WorkflowAiActionInput) => string> = {
  summarize: () =>
    "Fasse die folgende Formularantwort in maximal 3 prägnanten Sätzen auf Deutsch zusammen.",
  classify: (input) =>
    `Ordne die folgende Formularantwort genau einer dieser Kategorien zu: ${(input.categories ?? []).join(", ")}. Antworte nur mit dem Namen der Kategorie.`,
  translate: (input) =>
    `Übersetze die folgende Formularantwort ins ${input.targetLanguage ?? "Englische"}. Gib nur die Übersetzung zurück.`,
};

const SYSTEM_PROMPT = `Du unterstützt einen Workflow, der Formularantworten automatisch verarbeitet. Du erhältst eine einzelne Formularantwort und eine Aufgabe. Antworte präzise und ausschließlich mit dem angeforderten Ergebnis, ohne einleitende Sätze.`;

/** `workflow-ai-action:v1` (plan §11 prompt versioning) — runs inside a workflow, without a human click. */
export async function runWorkflowAiAction(
  input: WorkflowAiActionInput,
  context: AiFunctionContext,
) {
  const instruction = TASK_INSTRUCTIONS[input.task](input);
  const userPrompt = `Formular: ${input.formTitle}\n\nAufgabe: ${instruction}\n\nAntworten:\n${input.answersText}`;

  return runAiFunction(
    {
      name: "workflow-ai-action",
      promptVersion: "v1",
      outputSchema: workflowAiActionOutputSchema,
      maxTokens: 1024,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
    },
    context,
  );
}
