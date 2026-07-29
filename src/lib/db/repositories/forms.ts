import "server-only";
import { customAlphabet } from "nanoid";
import type { FormDefinition } from "@/lib/form-schema/schema";
import { CURRENT_SCHEMA_VERSION } from "@/lib/form-schema/schema";
import { createEmptyFormDefinition } from "@/lib/form-schema/factory";
import { AppError } from "@/lib/errors";
import { createUserClient } from "@/lib/db/user-client";
import type { Database } from "@/lib/db/database.types";

export type FormStatus = Database["public"]["Enums"]["form_status"];

export interface FormSummary {
  id: string;
  title: string;
  slug: string;
  status: FormStatus;
  createdAt: string;
  updatedAt: string;
  publishedVersionId: string | null;
  viewCount: number;
  startCount: number;
  completionCount: number;
  responseCount: number;
}

const nanoid = customAlphabet("23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ", 8);

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return (base || "formular") + "-" + nanoid();
}

export interface ListFormsFilter {
  status?: FormStatus;
  search?: string;
  sort?: "updated_desc" | "created_desc" | "responses_desc";
}

/**
 * Lists forms in a workspace with lightweight aggregate metrics (plan §4
 * dashboard cards: views, starts, completions, responses). Aggregates are
 * computed with separate scoped queries rather than a joined view — the
 * table volumes here are small enough (per-workspace, not global) that this
 * stays simple and RLS-safe without needing a materialized view yet.
 */
export async function listForms(
  workspaceId: string,
  filter: ListFormsFilter = {},
): Promise<FormSummary[]> {
  const supabase = await createUserClient();

  let query = supabase
    .from("forms")
    .select("id, title, slug, status, created_at, updated_at, published_version_id")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null);

  if (filter.status) query = query.eq("status", filter.status);
  if (filter.search) query = query.ilike("title", `%${filter.search}%`);

  switch (filter.sort) {
    case "created_desc":
      query = query.order("created_at", { ascending: false });
      break;
    default:
      query = query.order("updated_at", { ascending: false });
  }

  const { data: forms, error } = await query;
  if (error) {
    throw new AppError("INTERNAL_ERROR", "Formulare konnten nicht geladen werden.", {
      cause: error,
    });
  }
  if (!forms || forms.length === 0) return [];

  const formIds = forms.map((f) => f.id);

  const [{ data: events }, { data: responses }] = await Promise.all([
    supabase.from("form_events").select("form_id, event_type").in("form_id", formIds),
    supabase.from("responses").select("form_id").in("form_id", formIds),
  ]);

  const viewCounts = new Map<string, number>();
  const startCounts = new Map<string, number>();
  const completionCounts = new Map<string, number>();
  for (const event of events ?? []) {
    const map =
      event.event_type === "view"
        ? viewCounts
        : event.event_type === "start"
          ? startCounts
          : event.event_type === "submit"
            ? completionCounts
            : null;
    if (map) map.set(event.form_id, (map.get(event.form_id) ?? 0) + 1);
  }

  const responseCounts = new Map<string, number>();
  for (const response of responses ?? []) {
    responseCounts.set(response.form_id, (responseCounts.get(response.form_id) ?? 0) + 1);
  }

  const summaries = forms.map((form) => ({
    id: form.id,
    title: form.title,
    slug: form.slug,
    status: form.status,
    createdAt: form.created_at,
    updatedAt: form.updated_at,
    publishedVersionId: form.published_version_id,
    viewCount: viewCounts.get(form.id) ?? 0,
    startCount: startCounts.get(form.id) ?? 0,
    completionCount: completionCounts.get(form.id) ?? 0,
    responseCount: responseCounts.get(form.id) ?? 0,
  }));

  if (filter.sort === "responses_desc") {
    summaries.sort((a, b) => b.responseCount - a.responseCount);
  }

  return summaries;
}

export interface FormRecord {
  id: string;
  workspaceId: string;
  title: string;
  slug: string;
  status: FormStatus;
  draftDefinition: FormDefinition;
  draftRevision: number;
  schemaVersion: number;
  publishedVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getForm(formId: string): Promise<FormRecord | null> {
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("forms")
    .select("*")
    .eq("id", formId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL_ERROR", "Formular konnte nicht geladen werden.", { cause: error });
  }
  if (!data) return null;

  return {
    id: data.id,
    workspaceId: data.workspace_id,
    title: data.title,
    slug: data.slug,
    status: data.status,
    draftDefinition: data.draft_definition as unknown as FormDefinition,
    draftRevision: data.draft_revision,
    schemaVersion: data.schema_version,
    publishedVersionId: data.published_version_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/** Creates a new blank form (plan §3 "Leeres Formular"). Requires editor role — enforced by RLS. */
export async function createBlankForm(
  workspaceId: string,
  userId: string,
  title: string,
): Promise<FormRecord> {
  const supabase = await createUserClient();
  const definition = createEmptyFormDefinition(title);

  const { data, error } = await supabase
    .from("forms")
    .insert({
      workspace_id: workspaceId,
      title,
      slug: slugify(title),
      draft_definition: definition,
      schema_version: CURRENT_SCHEMA_VERSION,
      created_by: userId,
    })
    .select("*")
    .single();

  if (error) {
    throw new AppError("FORBIDDEN", "Formular konnte nicht erstellt werden.", { cause: error });
  }

  return {
    id: data.id,
    workspaceId: data.workspace_id,
    title: data.title,
    slug: data.slug,
    status: data.status,
    draftDefinition: data.draft_definition as unknown as FormDefinition,
    draftRevision: data.draft_revision,
    schemaVersion: data.schema_version,
    publishedVersionId: data.published_version_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/** Duplicates a form's current draft as a new, independent draft form (plan §4 "duplizieren"). */
export async function duplicateForm(formId: string, userId: string): Promise<FormRecord> {
  const source = await getForm(formId);
  if (!source) {
    throw new AppError("NOT_FOUND", "Formular nicht gefunden.");
  }

  const copyTitle = `${source.title} (Kopie)`;
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("forms")
    .insert({
      workspace_id: source.workspaceId,
      title: copyTitle,
      slug: slugify(copyTitle),
      draft_definition: {
        ...source.draftDefinition,
        metadata: { ...source.draftDefinition.metadata, title: copyTitle },
      },
      schema_version: source.schemaVersion,
      created_by: userId,
    })
    .select("*")
    .single();

  if (error) {
    throw new AppError("FORBIDDEN", "Formular konnte nicht dupliziert werden.", { cause: error });
  }

  return {
    id: data.id,
    workspaceId: data.workspace_id,
    title: data.title,
    slug: data.slug,
    status: data.status,
    draftDefinition: data.draft_definition as unknown as FormDefinition,
    draftRevision: data.draft_revision,
    schemaVersion: data.schema_version,
    publishedVersionId: data.published_version_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function renameForm(formId: string, title: string): Promise<void> {
  const supabase = await createUserClient();
  const { error } = await supabase.from("forms").update({ title }).eq("id", formId);
  if (error) {
    throw new AppError("FORBIDDEN", "Formular konnte nicht umbenannt werden.", { cause: error });
  }
}

export async function setFormStatus(
  formId: string,
  status: Extract<FormStatus, "paused" | "archived" | "draft">,
): Promise<void> {
  const supabase = await createUserClient();
  const { error } = await supabase.from("forms").update({ status }).eq("id", formId);
  if (error) {
    throw new AppError("FORBIDDEN", "Formularstatus konnte nicht geändert werden.", {
      cause: error,
    });
  }
}

/** Soft-delete (plan §4 "löschen") — never a hard delete, matching forms' RLS design (0004). */
export async function softDeleteForm(formId: string): Promise<void> {
  const supabase = await createUserClient();
  const { error } = await supabase
    .from("forms")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", formId);
  if (error) {
    throw new AppError("FORBIDDEN", "Formular konnte nicht gelöscht werden.", { cause: error });
  }
}
