import "server-only";
import { AppError } from "@/lib/errors";
import { createUserClient } from "@/lib/db/user-client";
import type { Database } from "@/lib/db/database.types";

export type ResponseStatus = Database["public"]["Enums"]["response_status"];

export interface ResponseSummary {
  id: string;
  formVersionId: string;
  versionNumber: number;
  status: ResponseStatus;
  submittedAt: string;
  durationMs: number | null;
  isRead: boolean;
  note: string | null;
}

export interface ListResponsesFilter {
  status?: ResponseStatus;
  /** Default view excludes spam/test unless explicitly filtered for (plan §8/§13). */
  includeSpamAndTest?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ListResponsesResult {
  responses: ResponseSummary[];
  total: number;
}

const DEFAULT_PAGE_SIZE = 20;

/** Lists responses for a form with pagination and status filtering (plan §8 Antwortverwaltung). */
export async function listResponses(
  formId: string,
  filter: ListResponsesFilter = {},
): Promise<ListResponsesResult> {
  const supabase = await createUserClient();
  const page = filter.page ?? 1;
  const pageSize = filter.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("responses")
    .select("id, form_version_id, status, submitted_at, duration_ms, read_at, note", {
      count: "exact",
    })
    .eq("form_id", formId);

  if (filter.status) {
    query = query.eq("status", filter.status);
  } else if (!filter.includeSpamAndTest) {
    query = query.not("status", "in", "(spam,test)");
  }

  const { data, error, count } = await query
    .order("submitted_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new AppError("INTERNAL_ERROR", "Antworten konnten nicht geladen werden.", {
      cause: error,
    });
  }
  if (!data || data.length === 0) return { responses: [], total: count ?? 0 };

  const versionIds = [...new Set(data.map((r) => r.form_version_id))];
  const { data: versions } = await supabase
    .from("form_versions")
    .select("id, version_number")
    .in("id", versionIds);
  const versionNumberById = new Map((versions ?? []).map((v) => [v.id, v.version_number]));

  return {
    responses: data.map((r) => ({
      id: r.id,
      formVersionId: r.form_version_id,
      versionNumber: versionNumberById.get(r.form_version_id) ?? 0,
      status: r.status,
      submittedAt: r.submitted_at,
      durationMs: r.duration_ms,
      isRead: r.read_at !== null,
      note: r.note,
    })),
    total: count ?? 0,
  };
}

export interface ResponseAnswer {
  fieldId: string;
  fieldType: string;
  value: unknown;
}

export interface ResponseDetail extends ResponseSummary {
  formId: string;
  answers: ResponseAnswer[];
}

export async function getResponse(responseId: string): Promise<ResponseDetail | null> {
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("responses")
    .select("id, form_id, form_version_id, status, submitted_at, duration_ms, read_at, note")
    .eq("id", responseId)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL_ERROR", "Antwort konnte nicht geladen werden.", { cause: error });
  }
  if (!data) return null;

  const [{ data: version }, { data: answers }] = await Promise.all([
    supabase
      .from("form_versions")
      .select("version_number")
      .eq("id", data.form_version_id)
      .maybeSingle(),
    supabase
      .from("response_answers")
      .select("field_id, field_type, value")
      .eq("response_id", responseId),
  ]);

  return {
    id: data.id,
    formId: data.form_id,
    formVersionId: data.form_version_id,
    versionNumber: version?.version_number ?? 0,
    status: data.status,
    submittedAt: data.submitted_at,
    durationMs: data.duration_ms,
    isRead: data.read_at !== null,
    note: data.note,
    answers: (answers ?? []).map((a) => ({
      fieldId: a.field_id,
      fieldType: a.field_type,
      value: a.value,
    })),
  };
}

export interface ExportableResponse {
  id: string;
  formVersionId: string;
  status: ResponseStatus;
  submittedAt: string;
  durationMs: number | null;
  answers: ResponseAnswer[];
}

/**
 * Fetches every response for a form (all statuses — the export UI filters
 * before calling this, mirroring the list page's status filter) with its
 * answers, for CSV export (plan §14/§25). Unpaginated by design: exports
 * are a single streamed file, not a browsable list.
 */
export async function listResponsesForExport(
  formId: string,
  filter: { status?: ResponseStatus } = {},
): Promise<ExportableResponse[]> {
  const supabase = await createUserClient();

  let query = supabase
    .from("responses")
    .select("id, form_version_id, status, submitted_at, duration_ms")
    .eq("form_id", formId);
  if (filter.status) query = query.eq("status", filter.status);

  const { data: responses, error } = await query.order("submitted_at", { ascending: true });
  if (error) {
    throw new AppError("INTERNAL_ERROR", "Antworten konnten nicht geladen werden.", {
      cause: error,
    });
  }
  if (!responses || responses.length === 0) return [];

  const responseIds = responses.map((r) => r.id);
  const { data: answers, error: answersError } = await supabase
    .from("response_answers")
    .select("response_id, field_id, field_type, value")
    .in("response_id", responseIds);
  if (answersError) {
    throw new AppError("INTERNAL_ERROR", "Antworten konnten nicht geladen werden.", {
      cause: answersError,
    });
  }

  const answersByResponse = new Map<string, ResponseAnswer[]>();
  for (const row of answers ?? []) {
    const list = answersByResponse.get(row.response_id) ?? [];
    list.push({ fieldId: row.field_id, fieldType: row.field_type, value: row.value });
    answersByResponse.set(row.response_id, list);
  }

  return responses.map((r) => ({
    id: r.id,
    formVersionId: r.form_version_id,
    status: r.status,
    submittedAt: r.submitted_at,
    durationMs: r.duration_ms,
    answers: answersByResponse.get(r.id) ?? [],
  }));
}

export async function markResponseRead(responseId: string): Promise<void> {
  const supabase = await createUserClient();
  const { error } = await supabase
    .from("responses")
    .update({ read_at: new Date().toISOString() })
    .eq("id", responseId)
    .is("read_at", null);
  if (error) {
    throw new AppError("FORBIDDEN", "Antwort konnte nicht als gelesen markiert werden.", {
      cause: error,
    });
  }
}

export async function setResponseNote(responseId: string, note: string): Promise<void> {
  const supabase = await createUserClient();
  const { error } = await supabase
    .from("responses")
    .update({ note: note || null })
    .eq("id", responseId);
  if (error) {
    throw new AppError("FORBIDDEN", "Notiz konnte nicht gespeichert werden.", { cause: error });
  }
}

export async function setResponseStatus(
  responseId: string,
  status: Extract<ResponseStatus, "completed" | "archived">,
): Promise<void> {
  const supabase = await createUserClient();
  const { error } = await supabase.from("responses").update({ status }).eq("id", responseId);
  if (error) {
    throw new AppError("FORBIDDEN", "Antwortstatus konnte nicht geändert werden.", {
      cause: error,
    });
  }
}

/**
 * Hard delete (plan §6/§14 "Hard Delete (personenbezogen; Löschung muss echt
 * sein)") — unlike forms' soft delete, responses contain visitor-submitted
 * personal data and must be genuinely removable. `response_answers` cascades
 * via its FK (0007).
 */
export async function deleteResponse(responseId: string): Promise<void> {
  const supabase = await createUserClient();
  const { error } = await supabase.from("responses").delete().eq("id", responseId);
  if (error) {
    throw new AppError("FORBIDDEN", "Antwort konnte nicht gelöscht werden.", { cause: error });
  }
}
