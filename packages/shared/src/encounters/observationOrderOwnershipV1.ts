/**
 * D3DA — Observation order ownership and ED-order transition classification.
 */

export type ObservationEdOrderTransitionClass =
  | "COMPLETED_BEFORE_ED_DEPARTURE"
  | "PENDING_RESULT_FROM_ED"
  | "REQUIRES_OBSERVATION_REORDER"
  | "REVIEWED_AND_CONTINUED"
  | "CANCELLED_AT_TRANSITION";

export type ObservationOrderOwnershipInput = {
  orderEncounterId: string;
  observationEncounterId: string;
  originatingEdEncounterId?: string | null;
  patientId?: string | null;
  orderPatientId?: string | null;
  facilityId?: string | null;
  orderFacilityId?: string | null;
};

export function assertObservationOrderOwnership(
  input: ObservationOrderOwnershipInput
): { ok: true } | { ok: false; reason: string } {
  const obs = String(input.observationEncounterId ?? "").trim();
  const orderEnc = String(input.orderEncounterId ?? "").trim();
  if (!obs || !orderEnc) return { ok: false, reason: "MISSING_ENCOUNTER" };
  if (orderEnc !== obs) return { ok: false, reason: "ORDER_NOT_OWNED_BY_OBSERVATION" };
  const ed = String(input.originatingEdEncounterId ?? "").trim();
  if (ed && orderEnc === ed) return { ok: false, reason: "ORDER_LINKED_TO_ED" };
  if (
    input.patientId &&
    input.orderPatientId &&
    String(input.patientId) !== String(input.orderPatientId)
  ) {
    return { ok: false, reason: "PATIENT_MISMATCH" };
  }
  if (
    input.facilityId &&
    input.orderFacilityId &&
    String(input.facilityId) !== String(input.orderFacilityId)
  ) {
    return { ok: false, reason: "FACILITY_MISMATCH" };
  }
  return { ok: true };
}

/** Closed ED orders must remain read-only from Observation. */
export function observationMayEditEdOwnedOrder(input: {
  orderEncounterId: string;
  observationEncounterId: string;
  originatingEdEncounterId?: string | null;
}): boolean {
  const orderEnc = String(input.orderEncounterId).trim();
  const ed = String(input.originatingEdEncounterId ?? "").trim();
  if (ed && orderEnc === ed) return false;
  return orderEnc === String(input.observationEncounterId).trim();
}

export function classifyEdOrderAtObservationTransition(input: {
  orderEncounterId: string;
  originatingEdEncounterId: string;
  orderStatus?: string | null;
  hasPendingResult?: boolean;
  explicitlyContinued?: boolean;
  cancelledAtTransition?: boolean;
}): ObservationEdOrderTransitionClass {
  const orderEnc = String(input.orderEncounterId).trim();
  const ed = String(input.originatingEdEncounterId).trim();
  if (input.cancelledAtTransition) return "CANCELLED_AT_TRANSITION";
  if (input.explicitlyContinued) return "REVIEWED_AND_CONTINUED";
  if (orderEnc !== ed) return "REQUIRES_OBSERVATION_REORDER";
  const status = String(input.orderStatus ?? "").toUpperCase();
  if (status === "COMPLETED" || status === "RESULTED" || status === "VERIFIED") {
    return "COMPLETED_BEFORE_ED_DEPARTURE";
  }
  if (input.hasPendingResult) return "PENDING_RESULT_FROM_ED";
  if (status === "CANCELLED") return "CANCELLED_AT_TRANSITION";
  return "REQUIRES_OBSERVATION_REORDER";
}

export const OBSERVATION_MEDICATION_CONTINUATION_ACTIONS = [
  "CONTINUE",
  "MODIFY",
  "HOLD",
  "DISCONTINUE",
  "REPLACE",
] as const;

export type ObservationMedicationContinuationAction =
  (typeof OBSERVATION_MEDICATION_CONTINUATION_ACTIONS)[number];

export function validateObservationMedicationContinuation(input: {
  action: ObservationMedicationContinuationAction;
  observationEncounterId: string;
  sourceEdEncounterId: string;
  autoImport?: boolean;
}): { ok: true } | { ok: false; reason: string } {
  if (input.autoImport) return { ok: false, reason: "AUTO_IMPORT_FORBIDDEN" };
  if (!OBSERVATION_MEDICATION_CONTINUATION_ACTIONS.includes(input.action)) {
    return { ok: false, reason: "INVALID_ACTION" };
  }
  if (
    String(input.observationEncounterId).trim() === String(input.sourceEdEncounterId).trim()
  ) {
    return { ok: false, reason: "ED_AND_OBSERVATION_MUST_DIFFER" };
  }
  return { ok: true };
}
