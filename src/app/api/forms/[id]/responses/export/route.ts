import { NextResponse } from "next/server";
import { z } from "zod";
import { getForm } from "@/lib/db/repositories/forms";
import { listResponsesForExport, type ResponseStatus } from "@/lib/db/repositories/responses";
import { getFormVersion } from "@/lib/db/repositories/form-versions";
import { buildResponsesCsv } from "@/lib/csv/responses-csv";
import type { FormDefinition } from "@/lib/form-schema/schema";
import { AppError, isAppError } from "@/lib/errors";

const querySchema = z.object({
  status: z.enum(["completed", "test", "spam", "archived"]).optional(),
});

/**
 * GET /api/forms/:id/responses/export — CSV download (plan §8/§14/§25).
 * Auth/authorization is RLS-backed: `getForm`/`listResponsesForExport` run
 * through the user-scoped Supabase client, so a form outside the caller's
 * workspace simply returns no rows/404, exactly like every other repository
 * call in this app — no separate role check needed here.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const form = await getForm(id);
    if (!form) throw new AppError("NOT_FOUND", "Formular nicht gefunden.");

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({ status: url.searchParams.get("status") ?? undefined });
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Ungültiger Filter.");

    const responses = await listResponsesForExport(id, {
      status: parsed.data.status as ResponseStatus | undefined,
    });

    const versionIds = [...new Set(responses.map((r) => r.formVersionId))];
    const definitionByVersionId = new Map<string, FormDefinition>();
    await Promise.all(
      versionIds.map(async (versionId) => {
        const version = await getFormVersion(versionId);
        if (version) definitionByVersionId.set(versionId, version.definition);
      }),
    );

    const csv = buildResponsesCsv(responses, definitionByVersionId);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${form.slug}-antworten.csv"`,
      },
    });
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
