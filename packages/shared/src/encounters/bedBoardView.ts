import type { ComposedBedBoardRow, ComposedFacilityBedBoard } from "./bedBoardComposition.js";
import type { BedOperationalStatus } from "./bedOperationalStatus.js";
import type { EncounterBedUnitCode } from "./facilityBedGovernance.js";

export type BedBoardUnit = EncounterBedUnitCode;

export type BedBoardOccupancySummary = {
  occupied: number;
  available: number;
  blocked: number;
  reserved: number;
  cleaning: number;
  dirty: number;
  transferPending: number;
  dischargePending: number;
};

export type BedBoardEntry = {
  storageKey: string;
  displayKey: string;
  unit: BedBoardUnit;
  status: BedOperationalStatus;
  occupantEncounterId?: string | null;
  patientDisplay?: string | null;
  reasonCode?: string | null;
  reasonText?: string | null;
};

/** API bed row — composed governance fields plus board view aliases. */
export type BedBoardApiBed = ComposedBedBoardRow & BedBoardEntry;

export type BedBoardUnitView = {
  unit: BedBoardUnit;
  unitCode: BedBoardUnit;
  summary: BedBoardOccupancySummary;
  beds: BedBoardApiBed[];
};

export type BedBoardViewResponse = {
  facilityId: string;
  generatedAt: string;
  units: BedBoardUnitView[];
};

export function emptyBedBoardOccupancySummary(): BedBoardOccupancySummary {
  return {
    occupied: 0,
    available: 0,
    blocked: 0,
    reserved: 0,
    cleaning: 0,
    dirty: 0,
    transferPending: 0,
    dischargePending: 0,
  };
}

export function mapComposedBedBoardRowToEntry(row: ComposedBedBoardRow): BedBoardEntry {
  return {
    storageKey: row.bedKey,
    displayKey: row.display,
    unit: row.unitCode,
    status: row.status,
    occupantEncounterId: row.occupantEncounterId,
    patientDisplay: row.occupantPatientName,
    reasonCode: row.reasonCode,
    reasonText: row.reasonText,
  };
}

export function enrichComposedBedBoardRow(row: ComposedBedBoardRow): BedBoardApiBed {
  return {
    ...row,
    ...mapComposedBedBoardRowToEntry(row),
  };
}

export function buildBedBoardOccupancySummary(
  beds: readonly Pick<BedBoardEntry, "status">[]
): BedBoardOccupancySummary {
  const summary = emptyBedBoardOccupancySummary();
  for (const bed of beds) {
    switch (bed.status) {
      case "OCCUPIED":
        summary.occupied += 1;
        break;
      case "AVAILABLE":
        summary.available += 1;
        break;
      case "BLOCKED":
        summary.blocked += 1;
        break;
      case "RESERVED":
        summary.reserved += 1;
        break;
      case "CLEANING":
        summary.cleaning += 1;
        break;
      case "DIRTY":
        summary.dirty += 1;
        break;
      case "TRANSFER_PENDING":
        summary.transferPending += 1;
        break;
      case "DISCHARGE_PENDING":
        summary.dischargePending += 1;
        break;
      default:
        break;
    }
  }
  return summary;
}

export function buildUnitBedBoardView(
  unitCode: BedBoardUnit,
  rows: readonly ComposedBedBoardRow[]
): BedBoardUnitView {
  const beds = rows.map(enrichComposedBedBoardRow);
  return {
    unit: unitCode,
    unitCode,
    summary: buildBedBoardOccupancySummary(beds),
    beds,
  };
}

export function buildFacilityBedBoardView(composed: ComposedFacilityBedBoard): BedBoardViewResponse {
  return {
    facilityId: composed.facilityId,
    generatedAt: composed.generatedAt,
    units: composed.units.map((unit) => buildUnitBedBoardView(unit.unitCode, unit.beds)),
  };
}
