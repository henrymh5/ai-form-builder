import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublishedFormBySlug, recordFormEvent } from "@/lib/db/repositories/public-forms";
import { checkRateLimit } from "@/lib/db/repositories/rate-limit";
import { AppError, isAppError } from "@/lib/errors";

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  eventType: z.enum([
    "start",
    "page_view",
    "field_interaction",
    "submit_attempt",
    "abandon",
  ]),
  pageId: z.string().max(64).optional(),
  fieldId: z.string().max(64).optional(),
});

/** POST /api/public/forms/:slug/events (plan §15/§18 analytics event stream). */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const form = await getPublishedFormBySlug(slug);
    if (!form) throw new AppError("NOT_FOUND", "Formular nicht gefunden.");

    const rawBody = await request.text();
    if (rawBody.length > 2000) throw new AppError("PAYLOAD_TOO_LARGE", "Anfrage zu groß.");
    const parsed = bodySchema.safeParse(JSON.parse(rawBody));
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Ungültige Eingabe.");

    await checkRateLimit(
      { scope: "public:event:session", windowMs: 60_000, max: 120 },
      parsed.data.sessionId,
    );

    await recordFormEvent({
      formId: form.formId,
      formVersionId: form.formVersionId,
      sessionId: parsed.data.sessionId,
      eventType: parsed.data.eventType,
      pageId: parsed.data.pageId,
      fieldId: parsed.data.fieldId,
    });

    return NextResponse.json({ ok: true });
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
