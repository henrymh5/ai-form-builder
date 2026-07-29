import type { Condition, Field, FormDefinition } from "@/lib/form-schema/schema";

/**
 * Static graph analyses over a form's page structure — plan §4.3/§9.1/§9.2.
 * Unlike navigation.ts (which simulates one concrete path for a given set of
 * answers), these functions reason about ALL possible answer combinations at
 * once, for use at publish time (before any real submission exists).
 *
 * Two deliberately different reachability stances are used:
 *
 * - Cycle detection is PESSIMISTIC: an edge is included if it is merely
 *   *possible* for some combination of answers (sequential fallback, or any
 *   jump/end condition). If a cycle exists in that graph, some real user
 *   could loop forever, so it is always reported as a hard error.
 *
 * - Unreachable-page / no-ending detection is OPTIMISTIC and heuristic: an
 *   edge is only *removed* (treated as impossible) when we can prove it,
 *   which for arbitrary rule sets is undecidable in general. The one
 *   provable case handled here: a `skip_page`/`jump_to_page`/`end_form`
 *   condition whose rules are all `is_answered` checks on fields that are
 *   themselves `required` — such a condition is guaranteed to fire once its
 *   owner page has been completed, since a required field is always
 *   answered by the time the user can move on. This is a genuinely common
 *   real-world authoring mistake (e.g. "if budget is answered, skip to
 *   page 3" on a form where budget is required) and is worth flagging;
 *   anything more general would require solving arbitrary boolean
 *   satisfiability over the rule set, which is out of scope (plan §20 —
 *   avoid overengineering).
 */

function findFieldById(definition: FormDefinition, fieldId: string): Field | undefined {
  for (const page of definition.pages) {
    const field = page.fields.find((f) => f.id === fieldId);
    if (field) return field;
  }
  return undefined;
}

/** Index of the page containing the highest-indexed field referenced by a condition's rules. */
function ownerPageIndex(definition: FormDefinition, condition: Condition): number {
  let maxIndex = -1;
  for (const rule of condition.rules) {
    const idx = definition.pages.findIndex((p) => p.fields.some((f) => f.id === rule.fieldId));
    if (idx > maxIndex) maxIndex = idx;
  }
  return maxIndex;
}

/** See module doc: heuristic for "this condition is guaranteed to fire". */
function isGuaranteedToFire(definition: FormDefinition, condition: Condition): boolean {
  if (condition.rules.length === 0) return false;
  return condition.rules.every((rule) => {
    if (rule.operator !== "is_answered") return false;
    const field = findFieldById(definition, rule.fieldId);
    return field !== undefined && "required" in field && field.required === true;
  });
}

export const GRAPH_END_SINK = "__end__";

interface PageGraph {
  /** Adjacency list keyed by page ID (or GRAPH_END_SINK as a target only). */
  edges: Map<string, Set<string>>;
}

/**
 * Builds the possible-transitions graph. `mode: "full"` includes every edge
 * that could ever occur for some answer combination (used for cycle
 * detection). `mode: "pruned"` additionally removes edges proven impossible
 * by `isGuaranteedToFire` (used for unreachable/no-ending checks).
 */
function buildPageGraph(definition: FormDefinition, mode: "full" | "pruned"): PageGraph {
  const edges = new Map<string, Set<string>>();
  const addEdge = (from: string, to: string) => {
    if (!edges.has(from)) edges.set(from, new Set());
    edges.get(from)!.add(to);
  };

  const pages = definition.pages;
  const guaranteedSkipTargets = new Set<string>();
  const guaranteedRedirectSourcePages = new Set<string>();

  if (mode === "pruned") {
    for (const condition of definition.conditions) {
      if (!isGuaranteedToFire(definition, condition)) continue;

      if (condition.action === "skip_page" && condition.targetId) {
        guaranteedSkipTargets.add(condition.targetId);
      }
      if (
        (condition.action === "jump_to_page" || condition.action === "end_form") &&
        condition.targetId
      ) {
        const ownerIdx = ownerPageIndex(definition, condition);
        if (ownerIdx >= 0) {
          guaranteedRedirectSourcePages.add(pages[ownerIdx]!.id);
        }
      }
    }
  }

  // Sequential edges — always possible unless pruned as guaranteed-bypassed.
  for (let i = 0; i < pages.length - 1; i++) {
    const from = pages[i]!.id;
    const to = pages[i + 1]!.id;
    if (mode === "pruned" && guaranteedRedirectSourcePages.has(from)) continue;
    if (mode === "pruned" && guaranteedSkipTargets.has(to)) continue;
    addEdge(from, to);
  }
  // Last page always leads to the default ending.
  if (pages.length > 0) {
    addEdge(pages[pages.length - 1]!.id, GRAPH_END_SINK);
  }

  // Jump/end edges — always added as a possible transition.
  for (const condition of definition.conditions) {
    if (!condition.targetId) continue;
    const ownerIdx = ownerPageIndex(definition, condition);
    if (ownerIdx < 0) continue;
    const from = pages[ownerIdx]!.id;

    if (condition.action === "jump_to_page") {
      addEdge(from, condition.targetId);
    }
    if (condition.action === "end_form") {
      addEdge(from, GRAPH_END_SINK);
    }
  }

  return { edges };
}

function bfsReachable(graph: PageGraph, startId: string): Set<string> {
  const visited = new Set<string>([startId]);
  const queue = [startId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of graph.edges.get(current) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return visited;
}

export interface CycleReport {
  cyclePageIds: string[];
}

/**
 * Detects cycles in the possible-transitions graph via DFS with a
 * white/gray/black coloring. Reports each distinct cycle found. Uses the
 * "full" (pessimistic) graph — a cycle that is merely possible, not
 * certain, is still a bug (plan §9.1: "Endlossprünge verhindern").
 */
export function detectCycles(definition: FormDefinition): CycleReport[] {
  const graph = buildPageGraph(definition, "full");
  const cycles: CycleReport[] = [];

  const color = new Map<string, "white" | "gray" | "black">();
  const pageIds = definition.pages.map((p) => p.id);
  for (const id of pageIds) color.set(id, "white");

  const stack: string[] = [];

  function visit(node: string): void {
    color.set(node, "gray");
    stack.push(node);

    for (const next of graph.edges.get(node) ?? []) {
      if (next === GRAPH_END_SINK) continue; // the sink is terminal, never part of a cycle
      const nextColor = color.get(next);
      if (nextColor === "gray") {
        const cycleStart = stack.indexOf(next);
        cycles.push({ cyclePageIds: stack.slice(cycleStart) });
      } else if (nextColor === "white") {
        visit(next);
      }
    }

    stack.pop();
    color.set(node, "black");
  }

  for (const id of pageIds) {
    if (color.get(id) === "white") visit(id);
  }

  return cycles;
}

/**
 * Finds pages that can be proven unreachable from the first page — see the
 * module doc for the (deliberately conservative) heuristic used.
 */
export function findUnreachablePages(definition: FormDefinition): string[] {
  if (definition.pages.length === 0) return [];
  const graph = buildPageGraph(definition, "pruned");
  const reachable = bfsReachable(graph, definition.pages[0]!.id);
  return definition.pages.filter((p) => !reachable.has(p.id)).map((p) => p.id);
}

/**
 * Finds pages from which no ending can be proven reachable under any
 * combination of answers (using the pessimistic "full" graph — a path to an
 * ending must exist in every possible-edges scenario to NOT be flagged, so
 * we check reachability to the sink in the full graph and flag anything that
 * can't get there at all, e.g. isolated inside a graph component with no
 * connection to the sink).
 */
export function findPathsWithoutEnding(definition: FormDefinition): string[] {
  const graph = buildPageGraph(definition, "full");

  // Reverse graph to compute "can reach GRAPH_END_SINK" via BFS from the sink.
  const reverseEdges = new Map<string, Set<string>>();
  for (const [from, targets] of graph.edges) {
    for (const to of targets) {
      if (!reverseEdges.has(to)) reverseEdges.set(to, new Set());
      reverseEdges.get(to)!.add(from);
    }
  }
  const canReachEnd = bfsReachable({ edges: reverseEdges }, GRAPH_END_SINK);

  return definition.pages.filter((p) => !canReachEnd.has(p.id)).map((p) => p.id);
}

/**
 * Validates that every rule/target reference in `conditions` points at a
 * field/page/ending that actually exists. This mirrors the reference checks
 * already performed by `validateFormDefinition` (plan §4.3) — exposed here
 * too since it is naturally part of the Logic Engine's graph-aware checks
 * and is used when wiring the `GraphAnalysis` interface.
 */
export interface ReferenceError {
  conditionId: string;
  reason: "unknown_field" | "unknown_target";
}

export function validateReferences(definition: FormDefinition): ReferenceError[] {
  const fieldIds = new Set(definition.pages.flatMap((p) => p.fields.map((f) => f.id)));
  const pageIds = new Set(definition.pages.map((p) => p.id));
  const endingIds = new Set(definition.endings.map((e) => e.id));

  const errors: ReferenceError[] = [];
  for (const condition of definition.conditions) {
    for (const rule of condition.rules) {
      if (!fieldIds.has(rule.fieldId)) {
        errors.push({ conditionId: condition.id, reason: "unknown_field" });
      }
    }
    if (condition.targetId) {
      const validTarget =
        fieldIds.has(condition.targetId) ||
        pageIds.has(condition.targetId) ||
        endingIds.has(condition.targetId);
      if (!validTarget) {
        errors.push({ conditionId: condition.id, reason: "unknown_target" });
      }
    }
  }
  return errors;
}
