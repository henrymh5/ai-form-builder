import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getPublishedFormBySlug,
  recordFormEvent,
  submitResponse,
} from "@/lib/db/repositories/public-forms";
import { checkRateLimit } from "@/lib/db/repositories/rate-limit";
import { getFieldVisibility } from "@/lib/logic-engine/visibility";
import { answersFor, type AnswerMap } from "@/lib/logic-engine/evaluate";
import { compilePageSchema } from "@/lib/validation/compile-page";
import { AppError, isAppError } from "@/lib/errors";

const MAX_PAYLOAD_BYTES = 100_000;

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  idempotencyKey: z.string().min(10).max(200),
  isTest: z.boolean().optional(),
  answers: z.record(z.string(), z.unknown()),
  /** Honeypot — a real visitor never sees or fills this field (plan §15/§25 "Schutz vor Bots"). */
  website: z.string().max(500).optional(),
});

/**
 * POST /api/public/forms/:slug/submissions (plan §15/§25). Server-side
 * re-validation is mandatory here — never trust that the client only sent
 * answers for currently-visible fields; visibility is recomputed from the
 * submitted answers themselves before validating against the compiled
 * per-field schema (plan §9 Logic Engine "gelöschte Zielfelder behandeln"
 * applies equally to a malicious/stale client bypassing the UI).
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const form = await getPublishedFormBySlug(slug);
    if (!form) throw new AppError("NOT_FOUND", "Formular nicht gefunden.");

    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > MAX_PAYLOAD_BYTES) {
      throw new AppError("PAYLOAD_TOO_LARGE", "Anfrage zu groß.");
    }
    const rawBody = await request.text();
    if (rawBody.length > MAX_PAYLOAD_BYTES) {
      throw new AppError("PAYLOAD_TOO_LARGE", "Anfrage zu groß.");
    }

    const parsed = bodySchema.safeParse(JSON.parse(rawBody));
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Ungültige Eingabe.");

    // Honeypot: a filled hidden field means a bot filled every input —
    // pretend success without persisting anything real.
    if (parsed.data.website) {
      return NextResponse.json({ responseId: "ok" });
    }

    await checkRateLimit(
      { scope: "public:submit:session", windowMs: 60_000, max: 5 },
      parsed.data.sessionId,
    );
    await checkRateLimit({ scope: "public:submit:form", windowMs: 60_000, max: 120 }, form.formId);

    await recordFormEvent({
      formId: form.formId,
      formVersionId: form.formVersionId,
      sessionId: parsed.data.sessionId,
      eventType: "submit_attempt",
    });

    const allFields = form.definition.pages.flatMap((p) => p.fields);
    const answerMap = answersFor(allFields, parsed.data.answers as AnswerMap);
    const visibleFieldIds = getFieldVisibility(form.definition, answerMap);
    const visibleFields = allFields.filter((f) => visibleFieldIds.has(f.id));

    const schema = compilePageSchema(visibleFields);
    const validation = schema.safeParse(parsed.data.answers);
    if (!validation.success) {
      throw new AppError("VALIDATION_ERROR", "Die Eingaben sind ungültig.", {
        details: { issues: validation.error.issues },
      });
    }

    const fieldByKey = new Map(
      visibleFields.filter((f) => "key" in f).map((f) => [(f as { key: string }).key, f]),
    );
    const answers = Object.entries(validation.data)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => {
        const field = fieldByKey.get(key)!;
        return { fieldId: field.id, fieldType: field.type, value };
      });

    const result = await submitResponse({
      formId: form.formId,
      formVersionId: form.formVersionId,
      sessionId: parsed.data.sessionId,
      idempotencyKey: parsed.data.idempotencyKey,
      isTest: parsed.data.isTest ?? false,
      answers,
    });

    if (!result.alreadySubmitted) {
      await recordFormEvent({
        formId: form.formId,
        formVersionId: form.formVersionId,
        sessionId: parsed.data.sessionId,
        eventType: "submit",
      });
    }

    return NextResponse.json({ responseId: result.responseId });
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
