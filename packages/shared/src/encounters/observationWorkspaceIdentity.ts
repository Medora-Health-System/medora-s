/**
 * D3D — Observation clinical identity (not ED, not Inpatient module).
 *
 * Product rule: Observation uses a **receiving encounter** that is distinct from the
 * originating ED encounter. Placement `requestedEncounterType === "OBSERVATION"` is the
 * durable clinical lane signal (EncounterType.OBSERVATION is intentionally not introduced).
 */

export type ObservationIdentityInput = {
  /** Receiving / destination encounter id (Observation chart). */
  observationEncounterId?: string | null;
  /** Originating ED encounter id (must differ when both present). */
  originatingEdEncounterId?: string | null;
  requestedEncounterType?: string | null;
  encounterType?: string | null;
  placementStatus?: string | null;
  arrivedDestinationAt?: string | Date | null;
  receivingEncounterId?: string | null;
};

/** True when placement lane is Observation (not Inpatient). */
export function isObservationPlacementLane(
  requestedEncounterType: string | null | undefined
): boolean {
  return String(requestedEncounterType ?? "").trim().toUpperCase() === "OBSERVATION";
}

/**
 * Observation clinical chart is ready when the receiving encounter exists and is distinct
 * from the ED origin (or when a short-stay INPATIENT encounter is already the destination).
 */
export function isObservationEncounterIndependentFromEd(input: ObservationIdentityInput): boolean {
  const obsId = String(input.observationEncounterId ?? input.receivingEncounterId ?? "").trim();
  const edId = String(input.originatingEdEncounterId ?? "").trim();
  if (!obsId) return false;
  if (edId && obsId === edId) return false;
  if (!isObservationPlacementLane(input.requestedEncounterType)) {
    // Legacy short-stay: open INPATIENT destination without placement type still allowed.
    return String(input.encounterType ?? "").trim().toUpperCase() === "INPATIENT";
  }
  return true;
}

/** ED medications/administrations must never auto-copy onto Observation MAR. */
export function observationMarMustNotAutoImportEdAdministrations(): boolean {
  return true;
}

export function resolveObservationWorkspaceEncounterId(input: {
  receivingEncounterId?: string | null;
  fallbackEncounterId?: string | null;
}): string | null {
  const receiving = String(input.receivingEncounterId ?? "").trim();
  if (receiving) return receiving;
  const fallback = String(input.fallbackEncounterId ?? "").trim();
  return fallback || null;
}

export function observationCensusRowIsArrived(input: {
  status?: string | null;
  arrivedDestinationAt?: string | Date | null;
  receivingEncounterId?: string | null;
}): boolean {
  if (String(input.status ?? "").trim().toUpperCase() === "ARRIVED_DESTINATION") return true;
  if (input.arrivedDestinationAt) return true;
  if (String(input.receivingEncounterId ?? "").trim()) return true;
  return false;
}
