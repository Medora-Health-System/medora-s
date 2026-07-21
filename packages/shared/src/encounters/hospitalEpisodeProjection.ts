/**
 * D3B — safe server-side HospitalEpisode projection (no PHI narrative).
 * Absence is always safe (null). Does not alter Encounter Clinical Summary.
 */

export type HospitalEpisodeStateProjection = {
  id: string;
  facilityId: string;
  patientId: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
  closeReason: string | null;
  originatingEncounterId: string;
  version: number;
  encounterIds: string[];
  /** Explicit: ED close does not close episode. */
  edEncounterCloseClosesEpisode: false;
};

export type HospitalEpisodeRowForProjection = {
  id: string;
  facilityId: string;
  patientId: string;
  status: string;
  openedAt: Date | string;
  closedAt: Date | string | null;
  closeReason: string | null;
  originatingEncounterId: string;
  version: number;
  encounters?: Array<{ id: string }> | null;
};

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Project episode state for API / internal consumers. Returns null when absent. */
export function projectHospitalEpisodeState(
  row: HospitalEpisodeRowForProjection | null | undefined
): HospitalEpisodeStateProjection | null {
  if (!row?.id) return null;
  const openedAt = toIso(row.openedAt);
  if (!openedAt) return null;
  return {
    id: row.id,
    facilityId: row.facilityId,
    patientId: row.patientId,
    status: String(row.status),
    openedAt,
    closedAt: toIso(row.closedAt),
    closeReason: row.closeReason ?? null,
    originatingEncounterId: row.originatingEncounterId,
    version: typeof row.version === "number" ? row.version : 1,
    encounterIds: (row.encounters ?? []).map((e) => e.id).filter(Boolean),
    edEncounterCloseClosesEpisode: false,
  };
}
