import "server-only";
import { AppError } from "@/lib/errors";
import { completionRate } from "@/lib/analytics/rates";
import { createUserClient } from "@/lib/db/user-client";
import { listForms, type FormStatus, type FormSummary } from "@/lib/db/repositories/forms";
import {
  getWorkspaceTimeSeries,
  getWorkspaceWorkflowActivity,
  type WorkflowActivity,
  type WorkspaceTimeSeries,
} from "@/lib/db/repositories/workspace-analytics";

export interface WorkspaceTotals {
  formCount: number;
  publishedCount: number;
  draftCount: number;
  viewCount: number;
  startCount: number;
  responseCount: number;
  /** Completions ÷ starts across the workspace, or `null` when nothing has started yet (matches analytics.ts/form-card.tsx's denominator). */
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
  /** Form counts by status, for the status donut — derived from `listForms`, no extra query. */
  statusBreakdown: Record<FormStatus, number>;
  timeSeries: WorkspaceTimeSeries;
  /** Highest-response forms, for the dense top-forms table. */
  topForms: FormSummary[];
  /** Most recently touched forms, for the "continue where you left off" grid. */
  recentForms: FormSummary[];
  recentResponses: RecentResponse[];
  workflowActivity: WorkflowActivity;
}

const RECENT_FORM_LIMIT = 6;
const RECENT_RESPONSE_LIMIT = 6;
const TOP_FORM_LIMIT = 5;

/**
 * Aggregated numbers for the workspace dashboard (plan §4).
 *
 * Builds on {@link listForms} rather than issuing its own per-form aggregates, so the dashboard
 * and the form list can never disagree about a form's counts. Everything here stays RLS-scoped;
 * at per-workspace volumes this is cheap enough that a materialized view isn't warranted yet.
 */
export async function getWorkspaceOverview(workspaceId: string): Promise<WorkspaceOverview> {
  const forms = await listForms(workspaceId);
  const formIds = forms.map((f) => f.id);

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
  totals.completionRate = completionRate(completions, totals.startCount);

  const statusBreakdown: Record<FormStatus, number> = {
    draft: 0,
    published: 0,
    paused: 0,
    archived: 0,
  };
  for (const form of forms) statusBreakdown[form.status] += 1;

  const [recentResponses, timeSeries, workflowActivity] = await Promise.all([
    listRecentResponses(forms),
    getWorkspaceTimeSeries(formIds),
    getWorkspaceWorkflowActivity(workspaceId),
  ]);

  const topForms = [...forms]
    .sort((a, b) => b.responseCount - a.responseCount)
    .slice(0, TOP_FORM_LIMIT);

  return {
    totals,
    statusBreakdown,
    timeSeries,
    topForms,
    // `listForms` already sorts by `updated_at` descending.
    recentForms: forms.slice(0, RECENT_FORM_LIMIT),
    recentResponses,
    workflowActivity,
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
