/**
 * D2.5 — pathway readiness helpers for the established disposition-safety engine.
 * Do not create a second close engine; callers merge these blockers into computeDispositionSafetyReadiness.
 */

import type { EdDispositionPath } from "./edEncounterLifecycle.js";
import {
  evaluatePathwayDocumentationBlockers,
  type PathwayBlocker,
} from "./edDispositionPathwayDocumentationV1.js";

/** Home discharge instruction blockers apply only to HOME (not AMA). */
export function isHomeDischargeInstructionsPath(path: EdDispositionPath): boolean {
  return path === "HOME";
}

export function evaluateDispositionPathwayReadinessBlockers(input: {
  path: EdDispositionPath;
  nursingAssessment: unknown;
  dischargeSummaryJson?: unknown;
}): PathwayBlocker[] {
  return evaluatePathwayDocumentationBlockers(
    input.path,
    input.nursingAssessment,
    input.dischargeSummaryJson
  );
}
