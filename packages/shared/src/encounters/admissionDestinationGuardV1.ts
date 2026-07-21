/**
 * D3E.5 — Placement destination context guards (Observation and Inpatient are siblings).
 */

import type { AdmissionDestinationContext } from "./admissionPathwaysV1.js";

export function assertPlacementDestinationMatchesReceivingContext(input: {
  placementRequestedEncounterType: string | null | undefined;
  receivingClinicalContext: AdmissionDestinationContext | "UNKNOWN" | string;
}): { ok: boolean; code: string | null } {
  const dest = String(input.placementRequestedEncounterType ?? "")
    .trim()
    .toUpperCase();
  const receiving = String(input.receivingClinicalContext ?? "")
    .trim()
    .toUpperCase();
  if (dest !== "OBSERVATION" && dest !== "INPATIENT") {
    return { ok: false, code: "INVALID_PLACEMENT_DESTINATION" };
  }
  if (receiving === "UNKNOWN") {
    return { ok: false, code: "RECEIVING_CONTEXT_UNKNOWN" };
  }
  if (dest === "INPATIENT" && receiving === "OBSERVATION") {
    return { ok: false, code: "INPATIENT_PLACEMENT_CANNOT_CREATE_OBSERVATION" };
  }
  if (dest === "OBSERVATION" && receiving === "INPATIENT") {
    return { ok: false, code: "OBSERVATION_PLACEMENT_CANNOT_CREATE_INPATIENT" };
  }
  if (dest !== receiving) {
    return { ok: false, code: "DESTINATION_CONTEXT_MISMATCH" };
  }
  return { ok: true, code: null };
}

export function destinationContextImmutableAfterReceivingCreated(input: {
  receivingEncounterId: string | null | undefined;
  previousDestination: string | null | undefined;
  nextDestination: string | null | undefined;
}): { ok: boolean; code: string | null } {
  const receiving = String(input.receivingEncounterId ?? "").trim();
  if (!receiving) return { ok: true, code: null };
  const prev = String(input.previousDestination ?? "")
    .trim()
    .toUpperCase();
  const next = String(input.nextDestination ?? "")
    .trim()
    .toUpperCase();
  if (prev && next && prev !== next) {
    return { ok: false, code: "DESTINATION_CONTEXT_LOCKED_AFTER_RECEIVING" };
  }
  return { ok: true, code: null };
}

export function billingClassificationForPlacementDestination(
  destination: "OBSERVATION" | "INPATIENT"
): "OBSERVATION" | "INPATIENT" {
  return destination;
}
