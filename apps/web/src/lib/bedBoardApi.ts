import { apiFetch } from "./apiClient";
import type { BedOperationalStatus, BedStatusUpdateDto, EncounterBedUnitCode } from "@medora/shared";

export type FacilityBedBoardBedRow = {
  bedKey: string;
  display: string;
  room: string;
  unitCode: EncounterBedUnitCode;
  status: BedOperationalStatus;
  statusSource: "derived" | "operational";
  occupantEncounterId: string | null;
  occupantPatientName: string | null;
  occupantMrn: string | null;
  reasonCode: string | null;
  reasonText: string | null;
  updatedAt: string | null;
};

export type FacilityBedBoardResponse = {
  facilityId: string;
  generatedAt: string;
  units: Array<{
    unitCode: EncounterBedUnitCode;
    beds: FacilityBedBoardBedRow[];
  }>;
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

export function indexBedBoardByKey(
  board: FacilityBedBoardResponse
): Map<string, FacilityBedBoardBedRow> {
  const map = new Map<string, FacilityBedBoardBedRow>();
  for (const unit of board.units) {
    for (const bed of unit.beds) {
      map.set(bed.bedKey, bed);
    }
  }
  return map;
}
