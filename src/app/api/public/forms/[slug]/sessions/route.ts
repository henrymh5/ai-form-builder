import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createPublicSession,
  getPublishedFormBySlug,
  recordFormEvent,
} from "@/lib/db/repositories/public-forms";
import { checkRateLimit } from "@/lib/db/repositories/rate-limit";
import { AppError, isAppError } from "@/lib/errors";

const bodySchema = z.object({
  isTest: z.boolean().optional(),
  referrer: z.string().max(2000).optional(),
  utmSource: z.string().max(200).optional(),
  utmMedium: z.string().max(200).optional(),
  utmCampaign: z.string().max(200).optional(),
});

/**
 * POST /api/public/forms/:slug/sessions (plan §15 "Beim Öffnen wird eine
 * anonyme Session erzeugt"). No auth — this is the anonymous public path;
 * protected only by rate limiting per plan §25. Device type and campaign
 * params are stored in `metadata`, never raw IP addresses (plan §15
 * "Personenbezogene Daten wie vollständige IP-Adressen sollten nicht
 * standardmäßig gespeichert werden").
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const form = await getPublishedFormBySlug(slug);
    if (!form) throw new AppError("NOT_FOUND", "Formular nicht gefunden.");

    const rawBody = await request.text();
    if (rawBody.length > 5000) {
      throw new AppError("PAYLOAD_TOO_LARGE", "Anfrage zu groß.");
    }
    const parsed = bodySchema.safeParse(rawBody ? JSON.parse(rawBody) : {});
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Ungültige Eingabe.");

    await checkRateLimit({ scope: "public:session:form", windowMs: 60_000, max: 60 }, form.formId);

    const userAgent = request.headers.get("user-agent") ?? "";
    const deviceType = /mobile|android|iphone/i.test(userAgent) ? "mobile" : "desktop";

    const sessionId = await createPublicSession({
      formId: form.formId,
      formVersionId: form.formVersionId,
      metadata: {
        deviceType,
        referrer: parsed.data.referrer,
        utmSource: parsed.data.utmSource,
        utmMedium: parsed.data.utmMedium,
        utmCampaign: parsed.data.utmCampaign,
        isTest: parsed.data.isTest ?? false,
      },
    });

    await recordFormEvent({
      formId: form.formId,
      formVersionId: form.formVersionId,
      sessionId,
      eventType: "view",
    });

    return NextResponse.json({ sessionId, formVersionId: form.formVersionId });
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
