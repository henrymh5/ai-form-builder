import "server-only";
import { createServiceClient } from "@/lib/db/service-client";
import type { FormDefinition } from "@/lib/form-schema/schema";

/**
 * Public (anonymous-visitor) access to published forms — plan §15/§7.2. All
 * of this goes through the service-role client because `anon` has zero
 * direct grants on `forms`/`form_versions`/`form_sessions`/etc (0006's
 * design: "Anonymous visitors never get a direct RLS policy... all public
 * writes go through Route Handlers using the service-role client"). Every
 * function here is deliberately narrow — it never returns more than a
 * public visitor should see (no draft content, no workspace internals).
 */
export interface PublishedForm {
  formId: string;
  formVersionId: string;
  slug: string;
  status: "published" | "paused";
  definition: FormDefinition;
}

export async function getPublishedFormBySlug(slug: string): Promise<PublishedForm | null> {
  const supabase = createServiceClient();
  const { data: form, error } = await supabase
    .from("forms")
    .select("id, slug, status, published_version_id")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !form || !form.published_version_id) return null;
  if (form.status !== "published" && form.status !== "paused") return null;

  const { data: version } = await supabase
    .from("form_versions")
    .select("id, definition")
    .eq("id", form.published_version_id)
    .maybeSingle();

  if (!version) return null;

  return {
    formId: form.id,
    formVersionId: version.id,
    slug: form.slug,
    status: form.status,
    definition: version.definition as unknown as FormDefinition,
  };
}

export async function createPublicSession(params: {
  formId: string;
  formVersionId: string;
  metadata: Record<string, unknown>;
}): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("form_sessions")
    .insert({
      form_id: params.formId,
      form_version_id: params.formVersionId,
      status: "started",
      metadata: params.metadata as never,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error("Failed to create form session");
  return data.id;
}

export async function recordFormEvent(params: {
  formId: string;
  formVersionId: string;
  sessionId: string;
  eventType:
    | "view"
    | "start"
    | "page_view"
    | "field_interaction"
    | "submit_attempt"
    | "submit"
    | "abandon";
  pageId?: string;
  fieldId?: string;
}): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("form_events").insert({
    form_id: params.formId,
    form_version_id: params.formVersionId,
    session_id: params.sessionId,
    event_type: params.eventType,
    page_id: params.pageId,
    field_id: params.fieldId,
  });
}

export interface SubmitResponseParams {
  formId: string;
  formVersionId: string;
  sessionId: string;
  idempotencyKey: string;
  isTest: boolean;
  answers: { fieldId: string; fieldType: string; value: unknown }[];
}

/**
 * Records a completed submission (plan §15/§25 idempotency + duplicate
 * detection). The DB's `responses_session_idempotency_unique` constraint
 * (0007) is the actual duplicate-submission guard — a retried submit with
 * the same key hits a unique-violation here, which the caller treats as
 * "already submitted" rather than an error.
 */
export async function submitResponse(
  params: SubmitResponseParams,
): Promise<{ responseId: string; alreadySubmitted: boolean }> {
  const supabase = createServiceClient();

  const { data: response, error } = await supabase
    .from("responses")
    .insert({
      form_id: params.formId,
      form_version_id: params.formVersionId,
      session_id: params.sessionId,
      status: params.isTest ? "test" : "completed",
      idempotency_key: params.idempotencyKey,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await supabase
        .from("responses")
        .select("id")
        .eq("session_id", params.sessionId)
        .eq("idempotency_key", params.idempotencyKey)
        .maybeSingle();
      if (existing) return { responseId: existing.id, alreadySubmitted: true };
    }
    throw new Error("Failed to record response");
  }

  if (params.answers.length > 0) {
    await supabase.from("response_answers").insert(
      params.answers.map((answer) => ({
        response_id: response.id,
        field_id: answer.fieldId,
        field_type: answer.fieldType,
        value: answer.value as never,
      })),
    );
  }

  await supabase
    .from("form_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", params.sessionId);

  return { responseId: response.id, alreadySubmitted: false };
}
