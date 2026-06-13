import { apiFetch } from "./apiClient";
import type {
  BedBoardOccupancySummary,
  BedOperationalStatus,
  BedStatusUpdateDto,
  EncounterBedUnitCode,
} from "@medora/shared";

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
  return apiFetch(`/facilities/${facilityId}/bed-board${query}`, {
    facilityId,
  }) as Promise<FacilityBedBoardResponse>;
}

export async function updateFacilityBedStatus(
  facilityId: string,
  bedKey: string,
  payload: BedStatusUpdateDto
): Promise<FacilityBedBoardBedRow> {
  return apiFetch(`/facilities/${facilityId}/beds/${encodeURIComponent(bedKey)}/status`, {
    method: "PATCH",
    facilityId,
    body: JSON.stringify(payload),
  }) as Promise<FacilityBedBoardBedRow>;
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
