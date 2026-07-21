/**
 * D3D — Observation MAR is encounter-scoped and never auto-imports ED administrations.
 */

export type ObservationMarImportDecision = {
  allow: boolean;
  reason: string;
};

export function decideObservationMarImportFromEd(input: {
  autoImport?: boolean;
  reviewedByClinician?: boolean;
  sourceEncounterId?: string | null;
  observationEncounterId?: string | null;
}): ObservationMarImportDecision {
  const obsId = String(input.observationEncounterId ?? "").trim();
  const sourceId = String(input.sourceEncounterId ?? "").trim();
  if (!obsId) {
    return { allow: false, reason: "MISSING_OBSERVATION_ENCOUNTER" };
  }
  if (sourceId && sourceId === obsId) {
    return { allow: false, reason: "SOURCE_IS_SAME_ENCOUNTER" };
  }
  if (input.autoImport === true) {
    return { allow: false, reason: "AUTO_IMPORT_FORBIDDEN" };
  }
  if (input.reviewedByClinician !== true) {
    return { allow: false, reason: "REQUIRES_CLINICIAN_REVIEW" };
  }
  return { allow: true, reason: "REVIEWED_CONTINUATION" };
}

export function observationMarIsSeparateFromEdMar(): boolean {
  return true;
}
