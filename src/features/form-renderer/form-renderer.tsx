"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import type { FormDefinition, Page } from "@/lib/form-schema/schema";
import { answersFor, type AnswerMap } from "@/lib/logic-engine/evaluate";
import { getFieldVisibility } from "@/lib/logic-engine/visibility";
import { getNextStep } from "@/lib/logic-engine/navigation";
import { computeProgress } from "@/lib/logic-engine/navigation";
import { compilePageSchema } from "@/lib/validation/compile-page";
import { RenderField } from "@/features/form-renderer/render-field";
import { ProgressIndicator } from "@/features/form-renderer/progress-indicator";

export type RendererMode = "preview" | "test" | "public";

export interface FormRendererProps {
  definition: FormDefinition;
  mode: RendererMode;
  /** Called once the respondent reaches an ending. Absent in read-only preview contexts. */
  onComplete?: (answers: Record<string, unknown>, endingId: string) => void;
  /** Called on every page advance — used by the public renderer for session/event tracking (Phase 13). */
  onPageView?: (pageId: string) => void;
}

/**
 * The single form-rendering component used in every mode (plan §13 "Es darf
 * nicht zwei getrennte Implementierungen geben... stattdessen dieselbe
 * Renderer-Komponente in verschiedenen Modi"). `mode` only changes chrome
 * (test-mode path panel) and what happens on completion — page logic,
 * validation, and field rendering are identical in all three modes.
 */
export function FormRenderer({ definition, mode, onComplete, onPageView }: FormRendererProps) {
  const [currentPageId, setCurrentPageId] = useState(definition.pages[0]?.id ?? "");
  const [allAnswers, setAllAnswers] = useState<Record<string, unknown>>({});
  const [endingId, setEndingId] = useState<string | null>(null);

  const currentPage = definition.pages.find((p) => p.id === currentPageId);

  useEffect(() => {
    // `onPageView` otherwise only fires on advance (see `onSubmitPage`
    // below), so a single-page form — or any form's very first page —
    // would never be tracked (plan §13 Funnel/"Gestartet" needs page 1 too).
    if (definition.pages[0]?.id) onPageView?.(definition.pages[0].id);
    // Fires once for the initial page only; subsequent page changes are
    // tracked explicitly in onSubmitPage below, not by re-running this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleFieldIds = useMemo(() => {
    const answerMap = answersForCurrentPage(definition, allAnswers);
    return getFieldVisibility(definition, answerMap);
  }, [definition, allAnswers]);

  const visibleFields = useMemo(
    () => currentPage?.fields.filter((f) => visibleFieldIds.has(f.id)) ?? [],
    [currentPage, visibleFieldIds],
  );

  const pageSchema = useMemo(() => compilePageSchema(visibleFields), [visibleFields]);

  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm({
    resolver: zodResolver(pageSchema),
    defaultValues: allAnswers,
    mode: "onSubmit",
  });

  if (definition.pages.length === 0) {
    return <p className="text-text-secondary text-sm">Dieses Formular hat keine Seiten.</p>;
  }

  if (endingId) {
    const ending = definition.endings.find((e) => e.id === endingId) ?? definition.endings[0]!;
    return (
      <div className="mx-auto max-w-lg space-y-3 py-16 text-center">
        <h1 className="text-text-primary text-2xl font-semibold">{ending.title}</h1>
        {ending.description ? (
          <p className="text-text-secondary text-sm">{ending.description}</p>
        ) : null}
        {mode !== "public" ? (
          <p className="text-text-muted text-xs">
            {mode === "test" ? "Testantwort — wurde nicht gespeichert." : "Vorschau-Ende."}
          </p>
        ) : null}
      </div>
    );
  }

  if (!currentPage) return null;

  const progress = computeProgress(
    definition,
    currentPage.id,
    answersForCurrentPage(definition, allAnswers),
  );

  function onSubmitPage(pageValues: Record<string, unknown>) {
    const merged = { ...allAnswers, ...pageValues };
    setAllAnswers(merged);

    const next = getNextStep(
      definition,
      currentPage!.id,
      answersForCurrentPage(definition, merged),
    );
    if (next.kind === "ending") {
      setEndingId(next.endingId);
      onComplete?.(merged, next.endingId);
    } else {
      setCurrentPageId(next.pageId);
      onPageView?.(next.pageId);
    }
  }

  const currentIndex = definition.pages.findIndex((p) => p.id === currentPage.id);
  const canGoBack = definition.settings.allowBack && currentIndex > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      {definition.settings.progressDisplay !== "none" ? (
        <ProgressIndicator mode={definition.settings.progressDisplay} progress={progress} />
      ) : null}

      {mode !== "public" ? (
        <p className="text-text-muted text-xs" data-testid="response-path">
          Antwortpfad: Schritt {progress.currentStepNumber} von {progress.totalSteps}
        </p>
      ) : null}

      {currentPage.title ? (
        <h1 className="text-text-primary text-xl font-semibold">{currentPage.title}</h1>
      ) : null}
      {currentPage.description ? (
        <p className="text-text-secondary text-sm">{currentPage.description}</p>
      ) : null}

      <form onSubmit={handleSubmit(onSubmitPage)} className="space-y-5">
        {visibleFields.map((field) => (
          <RenderField key={field.id} field={field} control={control} errors={errors} />
        ))}

        <div className="flex justify-between pt-2">
          {canGoBack ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setAllAnswers((prev) => ({ ...prev, ...getValues() }));
                setCurrentPageId(definition.pages[currentIndex - 1]!.id);
              }}
            >
              Zurück
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" variant="primary">
            Weiter
          </Button>
        </div>
      </form>
    </div>
  );
}

function answersForCurrentPage(
  definition: FormDefinition,
  values: Record<string, unknown>,
): AnswerMap {
  const allFields = definition.pages.flatMap((p: Page) => p.fields);
  return answersFor(allFields, values as AnswerMap);
}
