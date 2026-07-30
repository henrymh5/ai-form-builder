import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/db/repositories/profile";
import { listMyWorkspaces } from "@/lib/db/repositories/workspaces";
import { createUserClient } from "@/lib/db/user-client";
import { generateForm } from "@/lib/ai/functions/generate-form";
import { generateFormInputSchema } from "@/lib/ai/schemas";
import { toFormDefinition } from "@/lib/ai/convert";
import { CURRENT_SCHEMA_VERSION } from "@/lib/form-schema/schema";
import { validateFormDefinition, isValid } from "@/lib/form-schema/validate";
import { logicEngineGraphAnalysis } from "@/lib/logic-engine/wire-validation";
import { checkRateLimit, refundRateLimit, AI_RATE_LIMITS } from "@/lib/db/repositories/rate-limit";
import { AppError, isAppError } from "@/lib/errors";

const requestSchema = z.object({
  workspaceId: z.string().uuid(),
  description: z.string().min(10).max(2000),
});

/** Generation runs synchronously and can take ~30s, so the default function timeout is too tight (plan §5.4). */
export const maxDuration = 60;

/**
 * POST /api/ai/generate-form (plan §11 §22 "Vollständiges Formular
 * generieren"). Flow: auth -> rate limit -> Claude (structured output) ->
 * Zod re-validation -> domain validation (Logic Engine) -> safe IDs via
 * `toFormDefinition` -> saved as a new draft form -> builder opens it.
 */
export async function POST(request: Request) {
  // Set once the monthly quota has been consumed, so the catch block knows whether there
  // is a reservation to release. Stays null when the quota check itself rejected.
  let quotaConsumedBy: string | null = null;

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

    const workspaces = await listMyWorkspaces();
    const workspace = workspaces.find((w) => w.id === parsed.data.workspaceId);
    if (!workspace || workspace.role === "viewer") {
      throw new AppError("FORBIDDEN", "Keine Berechtigung für diesen Workspace.");
    }

    // Monthly quota first: a user who is out of generations should be told that, rather
    // than getting the generic "too many requests" from a burst limiter they also tripped.
    await checkRateLimit(AI_RATE_LIMITS.formGenerationPerUserMonth, user.id);
    quotaConsumedBy = user.id;
    await checkRateLimit(AI_RATE_LIMITS.perUserMinute, user.id);
    await checkRateLimit(AI_RATE_LIMITS.perWorkspaceMinute, workspace.id);
    await checkRateLimit(AI_RATE_LIMITS.perUserDaily, user.id);

    const aiOutput = await generateForm(
      generateFormInputSchema.parse({ description: parsed.data.description }),
      { userId: user.id, workspaceId: workspace.id, formId: null },
    );

    const definition = toFormDefinition(aiOutput);

    // Domain validation (plan §11 "Warum doppelt validieren?") — the JSON
    // schema already shaped Claude's output; this checks business rules
    // (limits, duplicate IDs, dangling condition references, cycles) the
    // same way a hand-built or duplicated form would be checked.
    const validation = validateFormDefinition(definition, logicEngineGraphAnalysis);
    if (!isValid(validation)) {
      throw new AppError("AI_INVALID_OUTPUT", "Die generierte Formularstruktur ist ungültig.", {
        details: { errors: validation.errors },
      });
    }

    const supabase = await createUserClient();
    const { data: form, error } = await supabase
      .from("forms")
      .insert({
        workspace_id: workspace.id,
        title: definition.metadata.title,
        slug: `${definition.metadata.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 60)}-${Date.now().toString(36)}`,
        draft_definition: definition,
        schema_version: CURRENT_SCHEMA_VERSION,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error || !form) {
      throw new AppError("FORBIDDEN", "Formular konnte nicht erstellt werden.", { cause: error });
    }

    return NextResponse.json({ formId: form.id });
  } catch (error) {
    // The attempt failed after the quota was consumed — give the generation back rather
    // than charging the user for an outage or a bad model response.
    if (quotaConsumedBy) {
      await refundRateLimit(AI_RATE_LIMITS.formGenerationPerUserMonth, quotaConsumedBy);
    }

    if (isAppError(error)) {
      return NextResponse.json(error.toResponseBody(), { status: error.status });
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unerwarteter Fehler." } },
      { status: 500 },
    );
  }
}
