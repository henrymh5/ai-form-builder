import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/db/repositories/profile";
import { generateOptions } from "@/lib/ai/functions/generate-options";
import { generateOptionsInputSchema } from "@/lib/ai/schemas";
import { checkRateLimit, AI_RATE_LIMITS } from "@/lib/db/repositories/rate-limit";
import { AppError, isAppError } from "@/lib/errors";

const requestSchema = generateOptionsInputSchema.extend({
  workspaceId: z.string().uuid(),
  formId: z.string().uuid().optional(),
});

/** POST /api/ai/generate-options (plan §11 "Antwortoptionen vorschlagen"). */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError("UNAUTHENTICATED", "Nicht angemeldet.");

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Ungültige Eingabe.");

    await checkRateLimit(AI_RATE_LIMITS.perUserMinute, user.id);
    await checkRateLimit(AI_RATE_LIMITS.perWorkspaceMinute, parsed.data.workspaceId);
    await checkRateLimit(AI_RATE_LIMITS.perUserDaily, user.id);

    const result = await generateOptions(
      { label: parsed.data.label, count: parsed.data.count },
      { userId: user.id, workspaceId: parsed.data.workspaceId, formId: parsed.data.formId ?? null },
    );

    return NextResponse.json(result);
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
