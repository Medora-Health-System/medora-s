/**
 * D3E — Inpatient order / MAR ownership (shared engines; encounter-scoped).
 */

export type InpatientOrderOwnershipDecision =
  | "OWNED_BY_INPATIENT_ENCOUNTER"
  | "FOREIGN_ENCOUNTER_REJECT"
  | "CROSS_ENCOUNTER_COPY_FORBIDDEN"
  | "CONTINUATION_REQUIRES_EXPLICIT_ACTION"
  | "FEATURE_DISABLED";

export function evaluateInpatientOrderPlacementOwnership(input: {
  featureEnabled: boolean;
  orderEncounterId: string;
  inpatientEncounterId: string;
}): { ok: boolean; decision: InpatientOrderOwnershipDecision } {
  if (!input.featureEnabled) {
    return { ok: false, decision: "FEATURE_DISABLED" };
  }
  const orderEnc = String(input.orderEncounterId ?? "").trim();
  const ipEnc = String(input.inpatientEncounterId ?? "").trim();
  if (!orderEnc || !ipEnc || orderEnc !== ipEnc) {
    return { ok: false, decision: "FOREIGN_ENCOUNTER_REJECT" };
  }
  return { ok: true, decision: "OWNED_BY_INPATIENT_ENCOUNTER" };
}

export function evaluateInpatientMarAdministrationOwnership(input: {
  featureEnabled: boolean;
  administrationEncounterId: string;
  inpatientEncounterId: string;
}): { ok: boolean; decision: InpatientOrderOwnershipDecision } {
  return evaluateInpatientOrderPlacementOwnership({
    featureEnabled: input.featureEnabled,
    orderEncounterId: input.administrationEncounterId,
    inpatientEncounterId: input.inpatientEncounterId,
  });
}

/** Observation → Inpatient: never auto-copy administrations; require explicit continue. */
export function evaluateObservationToInpatientMedicationContinuation(input: {
  featureEnabled: boolean;
  explicitContinue: boolean;
  sourceEncounterId: string;
  targetInpatientEncounterId: string;
}): { ok: boolean; decision: InpatientOrderOwnershipDecision } {
  if (!input.featureEnabled) {
    return { ok: false, decision: "FEATURE_DISABLED" };
  }
  const src = String(input.sourceEncounterId ?? "").trim();
  const tgt = String(input.targetInpatientEncounterId ?? "").trim();
  if (!src || !tgt || src === tgt) {
    return { ok: false, decision: "CROSS_ENCOUNTER_COPY_FORBIDDEN" };
  }
  if (!input.explicitContinue) {
    return { ok: false, decision: "CONTINUATION_REQUIRES_EXPLICIT_ACTION" };
  }
  return { ok: true, decision: "OWNED_BY_INPATIENT_ENCOUNTER" };
}

export function inpatientOrdersUseSharedEnterpriseEngines(): true {
  return true;
}
