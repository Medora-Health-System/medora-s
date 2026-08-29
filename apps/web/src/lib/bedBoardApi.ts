import { apiFetch } from "./apiClient";
import type {
  BedBoardOccupancySummary,
  BedOperationalStatus,
  BedStatusUpdateDto,
  EncounterBedUnitCode,
  InpatientDischargeAwarenessV1,
} from "@medora/shared";
import { buildGetDedupeKey } from "@/lib/getRequestDedupe";
import { logBedBoardMutationDebug } from "@/lib/bedBoardMutationDebug";
import { invalidateClinicalBoardGetCache } from "@/lib/invalidateClinicalBoardGetCache";
import { normalizeBedBoardApiRow } from "@/lib/normalizeBedBoardApiRow";

export type FacilityBedBoardBedRow = {
  bedKey: string;
  display: string;
  storageKey: string;
  displayKey: string;
  room: string;
  unitCode: EncounterBedUnitCode;
  unit: EncounterBedUnitCode;
  status: BedOperationalStatus;
  statusSource: "derived" | "operational";
  occupantEncounterId: string | null;
  occupantPatientName: string | null;
  patientDisplay: string | null;
  occupantMrn: string | null;
  occupantAgeYears?: number | null;
  occupantSex?: string | null;
  /** INP.DIS.1H */
  dischargeAwareness?: InpatientDischargeAwarenessV1 | null;
  reasonCode: string | null;
  reasonText: string | null;
  updatedAt: string | null;
};

export type FacilityBedBoardUnit = {
  unit: EncounterBedUnitCode;
  unitCode: EncounterBedUnitCode;
  summary: BedBoardOccupancySummary;
  beds: FacilityBedBoardBedRow[];
};

export type FacilityBedBoardResponse = {
  facilityId: string;
  generatedAt: string;
  units: FacilityBedBoardUnit[];
};

export async function fetchFacilityBedBoard(
  facilityId: string,
  unit?: EncounterBedUnitCode
): Promise<FacilityBedBoardResponse> {
  const query = unit ? `?unit=${encodeURIComponent(unit)}` : "";
  const path = `/facilities/${facilityId}/bed-board${query}`;
  logBedBoardMutationDebug("fetchFacilityBedBoard.get", {
    getAt: new Date().toISOString(),
    path,
    dedupeKey: buildGetDedupeKey(path, facilityId),
  });
  return apiFetch(path, {
    facilityId,
  }) as Promise<FacilityBedBoardResponse>;
}

export async function updateFacilityBedStatus(
  facilityId: string,
  bedKey: string,
  payload: BedStatusUpdateDto
): Promise<FacilityBedBoardBedRow> {
  const patchAt = new Date().toISOString();
  logBedBoardMutationDebug("updateFacilityBedStatus.request", {
    patchAt,
    facilityId,
    bedKey,
    payload,
  });
  const raw = (await apiFetch(`/facilities/${facilityId}/beds/${encodeURIComponent(bedKey)}/status`, {
    method: "PATCH",
    facilityId,
    body: JSON.stringify(payload),
  })) as FacilityBedBoardBedRow;
  const invalidation = invalidateClinicalBoardGetCache(facilityId);
  const normalized = normalizeBedBoardApiRow(raw);
  logBedBoardMutationDebug("updateFacilityBedStatus.response", {
    patchAt,
    invalidatedAt: invalidation.invalidatedAt,
    dedupeKeys: invalidation.dedupeKeys,
    facilityId,
    bedKey,
    returnedStatus: normalized.status,
    response: normalized,
  });
  return normalized;
}

export type FacilityBedStatusHistoryEntry = {
  id: string;
  occurredAt: string;
  actorDisplay: string | null;
  oldStatus: BedOperationalStatus | null;
  newStatus: BedOperationalStatus;
  reasonText: string | null;
  reasonCode: string | null;
};

export async function fetchBedStatusHistory(
  facilityId: string,
  bedKey: string,
  limit = 10
): Promise<FacilityBedStatusHistoryEntry[]> {
  const query = limit !== 10 ? `?limit=${encodeURIComponent(String(limit))}` : "";
  return apiFetch(
    `/facilities/${facilityId}/beds/${encodeURIComponent(bedKey)}/status-history${query}`,
    { facilityId }
  ) as Promise<FacilityBedStatusHistoryEntry[]>;
}

export function indexBedBoardByKey(
  board: FacilityBedBoardResponse
): Map<string, FacilityBedBoardBedRow> {
  const map = new Map<string, FacilityBedBoardBedRow>();
  for (const unit of board.units) {
    for (const bed of unit.beds) {
      map.set(bed.bedKey, bed);
      map.set(bed.storageKey, bed);
    }
  }
  return map;
}

export function findBedBoardUnit(
  board: FacilityBedBoardResponse,
  unit: EncounterBedUnitCode
): FacilityBedBoardUnit | null {
  return board.units.find((row) => row.unit === unit || row.unitCode === unit) ?? null;
}
