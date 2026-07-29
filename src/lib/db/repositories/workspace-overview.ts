import "server-only";
import { AppError } from "@/lib/errors";
import { createUserClient } from "@/lib/db/user-client";
import { listForms, type FormSummary } from "@/lib/db/repositories/forms";

export interface WorkspaceTotals {
  formCount: number;
  publishedCount: number;
  draftCount: number;
  viewCount: number;
  startCount: number;
  responseCount: number;
  /** Completions ÷ views across the workspace, or `null` when nothing has been viewed yet. */
  completionRate: number | null;
}

export interface RecentResponse {
  id: string;
  formId: string;
  formTitle: string;
  submittedAt: string;
  isRead: boolean;
}

export interface WorkspaceOverview {
  totals: WorkspaceTotals;
  /** Most recently touched forms, for the "continue where you left off" grid. */
  recentForms: FormSummary[];
  recentResponses: RecentResponse[];
}

const RECENT_FORM_LIMIT = 6;
const RECENT_RESPONSE_LIMIT = 6;

/**
 * Aggregated numbers for the workspace dashboard (plan §4).
 *
 * Builds on {@link listForms} rather than issuing its own per-form aggregates, so the dashboard
 * and the form list can never disagree about a form's counts. Both stay RLS-scoped; at
 * per-workspace volumes this is cheap enough that a materialized view isn't warranted yet.
 */
export async function getWorkspaceOverview(workspaceId: string): Promise<WorkspaceOverview> {
  const forms = await listForms(workspaceId);

  const totals = forms.reduce<WorkspaceTotals>(
    (acc, form) => ({
      formCount: acc.formCount + 1,
      publishedCount: acc.publishedCount + (form.status === "published" ? 1 : 0),
      draftCount: acc.draftCount + (form.status === "draft" ? 1 : 0),
      viewCount: acc.viewCount + form.viewCount,
      startCount: acc.startCount + form.startCount,
      responseCount: acc.responseCount + form.responseCount,
      completionRate: null,
    }),
    {
      formCount: 0,
      publishedCount: 0,
      draftCount: 0,
      viewCount: 0,
      startCount: 0,
      responseCount: 0,
      completionRate: null,
    },
  );

  const completions = forms.reduce((sum, form) => sum + form.completionCount, 0);
  totals.completionRate = totals.viewCount > 0 ? completions / totals.viewCount : null;

  return {
    totals,
    // `listForms` already sorts by `updated_at` descending.
    recentForms: forms.slice(0, RECENT_FORM_LIMIT),
    recentResponses: await listRecentResponses(forms),
  };
}

/** Newest submissions across every form in the workspace, titled for direct linking. */
async function listRecentResponses(forms: FormSummary[]): Promise<RecentResponse[]> {
  if (forms.length === 0) return [];

  const supabase = await createUserClient();
  const titleById = new Map(forms.map((form) => [form.id, form.title]));

  const { data, error } = await supabase
    .from("responses")
    .select("id, form_id, submitted_at, read_at")
    .in(
      "form_id",
      forms.map((form) => form.id),
    )
    // Test and spam submissions are excluded from productive figures (plan §13.2).
    .eq("status", "completed")
    .order("submitted_at", { ascending: false })
    .limit(RECENT_RESPONSE_LIMIT);

  if (error) {
    throw new AppError("INTERNAL_ERROR", "Antworten konnten nicht geladen werden.", {
      cause: error,
    });
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    formId: row.form_id,
    formTitle: titleById.get(row.form_id) ?? "Unbekanntes Formular",
    submittedAt: row.submitted_at,
    isRead: row.read_at !== null,
  }));
}
