import type { GraphAnalysis } from "@/lib/form-schema/validate";
import { detectCycles, findPathsWithoutEnding, findUnreachablePages } from "./graph";

/**
 * Concrete `GraphAnalysis` implementation, wiring the Logic Engine's graph
 * algorithms into `validateFormDefinition` (plan §4.3/§16 Phase 2 DoD:
 * "Anbindung an 1.5"). `lib/form-schema` defines the interface and stays
 * free of a dependency on `lib/logic-engine`; this is the one place the two
 * modules meet.
 */
export const logicEngineGraphAnalysis: GraphAnalysis = {
  detectCycles,
  findUnreachablePages,
  findPathsWithoutEnding,
};
