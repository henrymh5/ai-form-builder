import "server-only";
import { AppError } from "@/lib/errors";
import { createUserClient } from "@/lib/db/user-client";
import type { Field, FormDefinition } from "@/lib/form-schema/schema";
import { hasOptions } from "@/lib/form-schema/schema";

/**
 * On-demand analytics queries (plan §13) — no rollup table yet; volumes at
 * portfolio scale don't need it (see plan's own threshold note). Test/spam
 * responses (`responses.status`) are excluded from every metric here, per
 * plan §3/§13. Note: `start`/`field_interaction`/`abandon` events are never
 * fired by the current renderer (only `view`, `page_view`, `submit_attempt`,
 * `submit` are) — "Starts" is therefore derived from sessions with at least
 * one `page_view`, not from a `start` event.
 */

export interface AnalyticsOverview {
  views: number;
  starts: number;
  completions: number;
  completionRate: number;
  avgDurationMs: number | null;
}

export async function getAnalyticsOverview(formId: string): Promise<AnalyticsOverview> {
  const supabase = await createUserClient();

  const [{ count: views, error: viewsError }, { data: pageViewSessions, error: pvError }] =
    await Promise.all([
      supabase
        .from("form_events")
        .select("id", { count: "exact", head: true })
        .eq("form_id", formId)
        .eq("event_type", "view"),
      supabase
        .from("form_events")
        .select("session_id")
        .eq("form_id", formId)
        .eq("event_type", "page_view"),
    ]);

  if (viewsError || pvError) {
    throw new AppError("INTERNAL_ERROR", "Analytics konnten nicht geladen werden.", {
      cause: viewsError ?? pvError,
    });
  }

  const starts = new Set((pageViewSessions ?? []).map((s) => s.session_id)).size;

  const { data: completedSessions, error: sessionsError } = await supabase
    .from("form_sessions")
    .select("started_at, completed_at")
    .eq("form_id", formId)
    .eq("status", "completed");

  if (sessionsError) {
    throw new AppError("INTERNAL_ERROR", "Analytics konnten nicht geladen werden.", {
      cause: sessionsError,
    });
  }

  const { count: completions, error: completionsError } = await supabase
    .from("responses")
    .select("id", { count: "exact", head: true })
    .eq("form_id", formId)
    .eq("status", "completed");

  if (completionsError) {
    throw new AppError("INTERNAL_ERROR", "Analytics konnten nicht geladen werden.", {
      cause: completionsError,
    });
  }

  const durations = (completedSessions ?? [])
    .filter((s) => s.completed_at)
    .map((s) => new Date(s.completed_at!).getTime() - new Date(s.started_at).getTime());
  const avgDurationMs =
    durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;

  return {
    views: views ?? 0,
    starts,
    completions: completions ?? 0,
    completionRate: starts > 0 ? (completions ?? 0) / starts : 0,
    avgDurationMs,
  };
}

export interface FunnelStep {
  pageId: string;
  pageTitle: string;
  sessionCount: number;
}

/** Per-page funnel (plan §13): distinct sessions reaching each page, in document order. */
export async function getAnalyticsFunnel(
  formId: string,
  definition: FormDefinition,
): Promise<FunnelStep[]> {
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("form_events")
    .select("session_id, page_id")
    .eq("form_id", formId)
    .eq("event_type", "page_view");

  if (error) {
    throw new AppError("INTERNAL_ERROR", "Funnel konnte nicht geladen werden.", { cause: error });
  }

  const sessionsByPage = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    if (!row.page_id) continue;
    const set = sessionsByPage.get(row.page_id) ?? new Set<string>();
    set.add(row.session_id);
    sessionsByPage.set(row.page_id, set);
  }

  return definition.pages.map((page) => ({
    pageId: page.id,
    pageTitle: page.title || "Ohne Titel",
    sessionCount: sessionsByPage.get(page.id)?.size ?? 0,
  }));
}

export interface QuestionAnalytics {
  fieldId: string;
  label: string;
  answerCount: number;
  skipRate: number;
  topAnswers: { label: string; count: number }[];
}

type AnswerableField = Exclude<Field, { type: "heading" | "paragraph" | "divider" | "hidden" }>;

function isAnswerable(field: Field): field is AnswerableField {
  return !["heading", "paragraph", "divider", "hidden"].includes(field.type);
}

/**
 * Per-field analytics (plan §13 "Fragenanalyse"): answer/skip counts against
 * completed (non-test/spam) responses, plus most common values for
 * choice-family fields. Skip rate is relative to completed responses, not
 * page views — this shows "of respondents who finished, who skipped this
 * optional field," which is unambiguous, unlike drop-off-by-page tracking
 * that would need the unfired `field_interaction` event.
 */
export async function getQuestionAnalytics(
  formId: string,
  definition: FormDefinition,
): Promise<QuestionAnalytics[]> {
  const supabase = await createUserClient();

  const { data: responses, error: responsesError } = await supabase
    .from("responses")
    .select("id")
    .eq("form_id", formId)
    .eq("status", "completed");

  if (responsesError) {
    throw new AppError("INTERNAL_ERROR", "Fragenanalyse konnte nicht geladen werden.", {
      cause: responsesError,
    });
  }

  const responseIds = (responses ?? []).map((r) => r.id);
  const totalCompleted = responseIds.length;
  const fields = definition.pages.flatMap((p) => p.fields).filter(isAnswerable);

  if (totalCompleted === 0) {
    return fields.map((field) => ({
      fieldId: field.id,
      label: field.label,
      answerCount: 0,
      skipRate: 0,
      topAnswers: [],
    }));
  }

  const { data: answers, error: answersError } = await supabase
    .from("response_answers")
    .select("field_id, value")
    .in("response_id", responseIds);

  if (answersError) {
    throw new AppError("INTERNAL_ERROR", "Fragenanalyse konnte nicht geladen werden.", {
      cause: answersError,
    });
  }

  const answersByField = new Map<string, unknown[]>();
  for (const row of answers ?? []) {
    const list = answersByField.get(row.field_id) ?? [];
    list.push(row.value);
    answersByField.set(row.field_id, list);
  }

  return fields.map((field) => {
    const values = answersByField.get(field.id) ?? [];
    const answerCount = values.length;
    const skipRate = totalCompleted > 0 ? 1 - answerCount / totalCompleted : 0;

    let topAnswers: { label: string; count: number }[] = [];
    if (hasOptions(field)) {
      const counts = new Map<string, number>();
      for (const value of values) {
        const selected = Array.isArray(value) ? value : [value];
        for (const v of selected) {
          const key = String(v);
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
      topAnswers = [...counts.entries()]
        .map(([value, count]) => ({
          label: field.options.find((o) => o.value === value)?.label ?? value,
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    }

    return { fieldId: field.id, label: field.label, answerCount, skipRate, topAnswers };
  });
}
