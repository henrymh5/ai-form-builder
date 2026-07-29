import type { FormDefinition } from "@/lib/form-schema/schema";
import { evaluateCondition, type AnswerMap } from "./evaluate";
import { getPageVisibility } from "./visibility";

/**
 * Navigation and progress — plan §9.1/§9.2. Pure functions; no React, no IO.
 */

export type NavigationStep =
  { kind: "page"; pageId: string } | { kind: "ending"; endingId: string };

/** Runtime guard against pathological/cyclic condition data (defense in depth
 * beyond the build-time cycle check — plan §9.2). */
const MAX_NAVIGATION_HOPS = 1000;

function defaultEndingId(definition: FormDefinition): string {
  const defaultEnding = definition.endings.find((e) => e.isDefault);
  // Schema + domain validation guarantee exactly one default ending exists
  // before a form can be published; this is an unreachable-in-practice guard.
  return defaultEnding?.id ?? definition.endings[0]!.id;
}

/**
 * Determines the next step (page or ending) after `currentPageId`, given the
 * current answers. Priority (plan §9.2):
 *   1. The first matching `end_form` condition, in array order, wins.
 *   2. Otherwise the first matching `jump_to_page` condition, in array order.
 *   3. Otherwise the next visible page in document order.
 *   4. After the last page, the default ending.
 */
export function getNextStep(
  definition: FormDefinition,
  currentPageId: string,
  answers: AnswerMap,
): NavigationStep {
  const matchingEndForm = definition.conditions.find(
    (c) => c.action === "end_form" && evaluateCondition(c, answers),
  );
  if (matchingEndForm) {
    return { kind: "ending", endingId: matchingEndForm.targetId ?? defaultEndingId(definition) };
  }

  const matchingJump = definition.conditions.find(
    (c) => c.action === "jump_to_page" && c.targetId && evaluateCondition(c, answers),
  );
  if (matchingJump) {
    return { kind: "page", pageId: matchingJump.targetId! };
  }

  const visiblePages = getPageVisibility(definition, answers);
  const currentIndex = definition.pages.findIndex((p) => p.id === currentPageId);

  for (let i = currentIndex + 1; i < definition.pages.length; i++) {
    const page = definition.pages[i]!;
    if (visiblePages.has(page.id)) {
      return { kind: "page", pageId: page.id };
    }
  }

  return { kind: "ending", endingId: defaultEndingId(definition) };
}

/**
 * Simulates the path from the first page forward with the given answers,
 * returning every page actually reached along the way (in visit order).
 * Used for dynamic progress calculation (plan §7/§9.2) — pages that would be
 * skipped by conditional logic never appear in this list.
 */
export function getReachablePages(definition: FormDefinition, answers: AnswerMap): string[] {
  if (definition.pages.length === 0) return [];

  const visited: string[] = [];
  const seen = new Set<string>();
  let current: NavigationStep = { kind: "page", pageId: definition.pages[0]!.id };

  for (let hops = 0; hops < MAX_NAVIGATION_HOPS; hops++) {
    if (current.kind === "ending") break;
    if (seen.has(current.pageId)) break; // guard: a cyclic path must not loop forever
    seen.add(current.pageId);
    visited.push(current.pageId);
    current = getNextStep(definition, current.pageId, answers);
  }

  return visited;
}

export interface Progress {
  currentStepNumber: number;
  totalSteps: number;
  percent: number;
}

/**
 * Computes progress along the dynamically reachable path — pages skipped by
 * conditional logic never count toward `totalSteps` (plan §7).
 */
export function computeProgress(
  definition: FormDefinition,
  currentPageId: string,
  answers: AnswerMap,
): Progress {
  const reachable = getReachablePages(definition, answers);
  const currentIndex = reachable.indexOf(currentPageId);

  const totalSteps = reachable.length || 1;
  const currentStepNumber = currentIndex === -1 ? 1 : currentIndex + 1;
  const percent = Math.round((currentStepNumber / totalSteps) * 100);

  return { currentStepNumber, totalSteps, percent };
}
