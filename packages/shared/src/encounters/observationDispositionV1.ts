/**
 * D3D — Observation disposition pathways (reuses D2 concepts; hospital-scoped).
 * Execution remains gated by OBSERVATION_WORKSPACE + receiving encounter foundation.
 */

export const OBSERVATION_DISPOSITION_PATHWAYS = [
  "DISCHARGE_HOME",
  "CONVERT_TO_INPATIENT",
  "TRANSFER",
  "RETURN_TO_ED",
  "AMA",
  "DEATH",
] as const;

export type ObservationDispositionPathway = (typeof OBSERVATION_DISPOSITION_PATHWAYS)[number];

export type ObservationDispositionDecision = {
  pathway: ObservationDispositionPathway;
  observationEncounterId: string;
  originatingEdEncounterId?: string | null;
  reasonSummary?: string | null;
};

export function isObservationDispositionPathway(value: unknown): value is ObservationDispositionPathway {
  return (
    typeof value === "string" &&
    (OBSERVATION_DISPOSITION_PATHWAYS as readonly string[]).includes(value)
  );
}

/** Direct Observation discharge (does not require returning to ED first). */
export function observationCanDischargeDirectly(pathway: ObservationDispositionPathway): boolean {
  return pathway === "DISCHARGE_HOME" || pathway === "AMA" || pathway === "DEATH";
}

/** Safe conversion target — Inpatient module is later; pathway is recorded, not full IP chart. */
export function observationCanConvertToInpatient(pathway: ObservationDispositionPathway): boolean {
  return pathway === "CONVERT_TO_INPATIENT";
}

export function validateObservationDispositionDecision(
  decision: ObservationDispositionDecision
): { ok: true } | { ok: false; reason: string } {
  if (!isObservationDispositionPathway(decision.pathway)) {
    return { ok: false, reason: "INVALID_PATHWAY" };
  }
  if (!String(decision.observationEncounterId ?? "").trim()) {
    return { ok: false, reason: "MISSING_OBSERVATION_ENCOUNTER" };
  }
  if (
    decision.originatingEdEncounterId &&
    decision.originatingEdEncounterId === decision.observationEncounterId
  ) {
    return { ok: false, reason: "ED_AND_OBSERVATION_MUST_DIFFER" };
  }
  return { ok: true };
}
