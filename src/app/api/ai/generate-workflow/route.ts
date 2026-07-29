import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/db/repositories/profile";
import { getForm } from "@/lib/db/repositories/forms";
import { listMyWorkspaces } from "@/lib/db/repositories/workspaces";
import { createUserClient } from "@/lib/db/user-client";
import { generateWorkflow } from "@/lib/ai/functions/generate-workflow";
import { generateWorkflowInputSchema } from "@/lib/ai/workflow-schemas";
import { toWorkflowDefinition } from "@/lib/ai/convert-workflow";
import { CURRENT_WORKFLOW_SCHEMA_VERSION } from "@/lib/workflow-schema/schema";
import { validateWorkflowDefinition, isWorkflowValid } from "@/lib/workflow-schema/validate";
import { checkRateLimit, AI_RATE_LIMITS } from "@/lib/db/repositories/rate-limit";
import { AppError, isAppError } from "@/lib/errors";
import { customAlphabet } from "nanoid";

const requestSchema = z.object({
  formId: z.string().uuid(),
  description: z.string().min(10).max(2000),
});

const webhookSecretAlphabet = customAlphabet(
  "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ",
  32,
);

/** Generation runs synchronously and can take ~30s (plan §5.4, mirrors generate-form). */
export const maxDuration = 60;

/**
 * POST /api/ai/generate-workflow. Flow: auth -> role check -> rate limits ->
 * Claude (structured output) -> Zod re-validation -> label->fieldId
 * resolution + dagre layout (convert-workflow.ts) -> domain validation ->
 * saved as a new, paused workflow -> editor opens it.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AppError("UNAUTHENTICATED", "Nicht angemeldet.");
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Ungültige Eingabe.");
    }

    const form = await getForm(parsed.data.formId);
    if (!form) {
      throw new AppError("NOT_FOUND", "Formular nicht gefunden.");
    }

    const workspaces = await listMyWorkspaces();
    const workspace = workspaces.find((w) => w.id === form.workspaceId);
    if (!workspace || workspace.role === "viewer") {
      throw new AppError("FORBIDDEN", "Keine Berechtigung für dieses Formular.");
    }

    await checkRateLimit(AI_RATE_LIMITS.perUserMinute, user.id);
    await checkRateLimit(AI_RATE_LIMITS.perWorkspaceMinute, workspace.id);
    await checkRateLimit(AI_RATE_LIMITS.perUserDaily, user.id);

    const aiOutput = await generateWorkflow(
      generateWorkflowInputSchema.parse({
        formId: parsed.data.formId,
        description: parsed.data.description,
      }),
      form.draftDefinition,
      { userId: user.id, workspaceId: workspace.id, formId: form.id },
    );

    const definition = toWorkflowDefinition(aiOutput, form.draftDefinition);

    // Domain validation (plan §11 "Warum doppelt validieren?") — the JSON
    // schema already shaped Claude's output; this checks structural rules
    // (single trigger, acyclic, valid handles) the same way a hand-built
    // workflow would be checked.
    const validation = validateWorkflowDefinition(definition, form.draftDefinition);
    if (!isWorkflowValid(validation)) {
      throw new AppError("AI_INVALID_OUTPUT", "Der generierte Workflow ist ungültig.", {
        details: { errors: validation.errors },
      });
    }

    const supabase = await createUserClient();
    const { data: workflow, error } = await supabase
      .from("workflows")
      .insert({
        form_id: form.id,
        name: aiOutput.name,
        status: "paused",
        definition: definition as never,
        schema_version: CURRENT_WORKFLOW_SCHEMA_VERSION,
        webhook_secret: webhookSecretAlphabet(),
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error || !workflow) {
      throw new AppError("FORBIDDEN", "Workflow konnte nicht erstellt werden.", { cause: error });
    }

    return NextResponse.json({ workflowId: workflow.id });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json(error.toResponseBody(), { status: error.status });
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unerwarteter Fehler." } },
      { status: 500 },
    );
  }
}
