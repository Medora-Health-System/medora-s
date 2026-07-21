/**
 * D3E — Inpatient census / workspace identity helpers.
 * Placement requested type OBSERVATION stays Observation; INPATIENT opens this workspace.
 */

export type InpatientCensusPlacementLike = {
  requestedEncounterType?: string | null;
  status?: string | null;
  receivingEncounterId?: string | null;
  encounterId?: string | null;
  arrivedAt?: string | Date | null;
  acceptedAt?: string | Date | null;
  createdAt?: string | Date | null;
};

export function isInpatientPlacementRequest(
  row: Pick<InpatientCensusPlacementLike, "requestedEncounterType">
): boolean {
  return String(row.requestedEncounterType ?? "")
    .trim()
    .toUpperCase() === "INPATIENT";
}

export function inpatientCensusRowIsArrived(input: {
  status?: string | null;
  arrivedDestinationAt?: string | Date | null;
  arrivedAt?: string | Date | null;
  receivingEncounterId?: string | null;
}): boolean {
  const status = String(input.status ?? "")
    .trim()
    .toUpperCase();
  if (
    status === "ARRIVED_DESTINATION" ||
    status === "ARRIVED" ||
    status === "COMPLETED"
  ) {
    return true;
  }
  if (input.arrivedDestinationAt || input.arrivedAt) return true;
  if (input.receivingEncounterId) return true;
  return false;
}

export function resolveInpatientWorkspaceEncounterId(input: {
  receivingEncounterId?: string | null;
  fallbackEncounterId?: string | null;
}): string | null {
  const receiving = String(input.receivingEncounterId ?? "").trim();
  if (receiving) return receiving;
  const fallback = String(input.fallbackEncounterId ?? "").trim();
  return fallback || null;
}

/** Hospital day 1 = calendar day of admission start (local UTC date math for determinism). */
export function computeHospitalDay(
  admissionStartedAt: string | Date | null | undefined,
  now: Date = new Date()
): number | null {
  if (!admissionStartedAt) return null;
  const start = new Date(admissionStartedAt);
  if (!Number.isFinite(start.getTime())) return null;
  const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Math.floor((nowUtc - startUtc) / (24 * 60 * 60 * 1000)) + 1;
  return days < 1 ? 1 : days;
}

export function computeLengthOfStayHours(
  admissionStartedAt: string | Date | null | undefined,
  now: Date = new Date()
): number | null {
  if (!admissionStartedAt) return null;
  const start = new Date(admissionStartedAt);
  if (!Number.isFinite(start.getTime())) return null;
  const ms = now.getTime() - start.getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.floor(ms / (60 * 60 * 1000));
}

export function resolveInpatientAdmissionClock(
  row: Pick<InpatientCensusPlacementLike, "arrivedAt" | "acceptedAt" | "createdAt">
): string | Date | null {
  return row.arrivedAt ?? row.acceptedAt ?? row.createdAt ?? null;
}
