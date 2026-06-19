import {
  buildBedBoardOccupancySummary,
  buildFacilityBedBoardView,
  composeFacilityBedBoard,
  parseCanonicalBedKey,
  type BedBoardOccupancyRow,
  type BedOperationalOverlayRecord,
  type EncounterBedUnitCode,
} from "@medora/shared";
import type { FacilityBedBoardBedRow, FacilityBedBoardResponse } from "@/lib/bedBoardApi";
import { indexBedBoardByKey } from "@/lib/bedBoardApi";
import { logBedBoardMutationDebug } from "@/lib/bedBoardMutationDebug";
import { normalizeBedBoardApiRow } from "@/lib/normalizeBedBoardApiRow";

export type BedBoardEncounterOccupancySource = {
  id: string;
  roomLabel?: string | null;
  type?: string | null;
  admissionSummaryJson?: unknown;
  workflowState?: string | null;
  patient?: {
    firstName?: string | null;
    lastName?: string | null;
    mrn?: string | null;
  } | null;
};

function bedRowLookupKeys(bed: Pick<FacilityBedBoardBedRow, "bedKey" | "storageKey">): string[] {
  const keys = new Set<string>();
  for (const candidate of [bed.storageKey, bed.bedKey]) {
    if (!candidate) continue;
    keys.add(candidate);
    const parsed = parseCanonicalBedKey(candidate);
    if (parsed) {
      keys.add(`${parsed.unit}:${parsed.room}`);
      keys.add(`${parsed.unit}-${parsed.room}`);
    }
  }
  return [...keys];
}

function bedRowsMatch(
  existing: Pick<FacilityBedBoardBedRow, "bedKey" | "storageKey">,
  updated: Pick<FacilityBedBoardBedRow, "bedKey" | "storageKey">
): boolean {
  const updatedKeys = bedRowLookupKeys(updated);
  return bedRowLookupKeys(existing).some((key) => updatedKeys.includes(key));
}

function normalizeWebBedRow(bed: FacilityBedBoardBedRow): FacilityBedBoardBedRow {
  return normalizeBedBoardApiRow(bed);
}

export function extractOperationalOverlaysFromBedBoard(
  board: FacilityBedBoardResponse | null
): Map<string, BedOperationalOverlayRecord> {
  const overlays = new Map<string, BedOperationalOverlayRecord>();
  if (!board) return overlays;
  for (const unit of board.units) {
    for (const bed of unit.beds) {
      if (bed.statusSource !== "operational") continue;
      overlays.set(bed.bedKey, {
        bedKey: bed.bedKey,
        bedDisplay: bed.display,
        unitCode: bed.unitCode,
        room: bed.room,
        status: bed.status,
        cleared: bed.status === "AVAILABLE",
        reasonCode: bed.reasonCode,
        reasonText: bed.reasonText,
        updatedAt: bed.updatedAt ?? new Date().toISOString(),
      });
    }
  }
  return overlays;
}

export function encountersToBedBoardOccupancyRows(
  encounters: readonly BedBoardEncounterOccupancySource[]
): BedBoardOccupancyRow[] {
  return encounters
    .filter((row) => Boolean((row.roomLabel ?? "").trim()))
    .map((row) => ({
      id: row.id,
      facilityId: "",
      roomLabel: row.roomLabel ?? null,
      type: row.type ?? null,
      admissionSummaryJson: row.admissionSummaryJson,
      status: "OPEN",
      workflowState: row.workflowState ?? null,
      disposition: null,
      patientFirstName: row.patient?.firstName ?? null,
      patientLastName: row.patient?.lastName ?? null,
      patientMrn: row.patient?.mrn ?? null,
    }));
}

function mapViewToFacilityBedBoardResponse(
  view: ReturnType<typeof buildFacilityBedBoardView>
): FacilityBedBoardResponse {
  return {
    facilityId: view.facilityId,
    generatedAt: view.generatedAt,
    units: view.units.map((unit) => ({
      unit: unit.unit,
      unitCode: unit.unitCode,
      summary: unit.summary,
      beds: unit.beds.map((bed) =>
        normalizeWebBedRow({
          bedKey: bed.bedKey,
          display: bed.display,
          storageKey: bed.storageKey,
          displayKey: bed.displayKey,
          room: bed.room,
          unitCode: bed.unitCode,
          unit: bed.unitCode,
          status: bed.status,
          statusSource: bed.statusSource,
          occupantEncounterId: bed.occupantEncounterId,
          occupantPatientName: bed.occupantPatientName,
          patientDisplay: bed.patientDisplay ?? bed.occupantPatientName,
          occupantMrn: bed.occupantMrn,
          reasonCode: bed.reasonCode,
          reasonText: bed.reasonText,
          updatedAt: bed.updatedAt,
        })
      ),
    })),
  };
}

/** Recompose a unit bed board from encounter occupancy + preserved operational overlays. */
export function rebuildFacilityBedBoardUnitFromEncounters(input: {
  facilityId: string;
  unit: EncounterBedUnitCode;
  encounters: readonly BedBoardEncounterOccupancySource[];
  previousBoard: FacilityBedBoardResponse | null;
}): FacilityBedBoardResponse | null {
  const overlays = extractOperationalOverlaysFromBedBoard(input.previousBoard);
  const composed = composeFacilityBedBoard({
    facilityId: input.facilityId,
    unitFilter: input.unit,
    encounters: encountersToBedBoardOccupancyRows(input.encounters),
    overlays,
  });
  const view = buildFacilityBedBoardView(composed);
  const rebuilt = mapViewToFacilityBedBoardResponse(view);
  const rebuiltUnit = rebuilt.units.find((row) => row.unitCode === input.unit);
  if (!rebuiltUnit) return input.previousBoard;

  if (!input.previousBoard) {
    return rebuilt;
  }

  const units = input.previousBoard.units.map((unit) =>
    unit.unitCode === input.unit ? rebuiltUnit : unit
  );
  if (!input.previousBoard.units.some((unit) => unit.unitCode === input.unit)) {
    units.push(rebuiltUnit);
  }
  return {
    ...input.previousBoard,
    generatedAt: rebuilt.generatedAt,
    units,
  };
}

/** Apply a single bed status PATCH response immediately (no refetch wait). */
export function applyBedBoardStatusPatch(
  board: FacilityBedBoardResponse,
  updatedBed: FacilityBedBoardBedRow
): FacilityBedBoardResponse {
  const normalizedUpdated = normalizeWebBedRow(updatedBed);
  let matched = false;
  const units = board.units.map((unit) => {
    const beds = unit.beds.map((bed) => {
      if (!bedRowsMatch(bed, normalizedUpdated)) return bed;
      matched = true;
      return normalizeWebBedRow({
        ...bed,
        ...normalizedUpdated,
      });
    });
    return {
      ...unit,
      beds,
      summary: buildBedBoardOccupancySummary(beds),
    };
  });
  logBedBoardMutationDebug("applyBedBoardStatusPatch", {
    matched,
    updatedBedKey: normalizedUpdated.bedKey,
    beforeStatus: board.units.flatMap((unit) => unit.beds).find((bed) => bedRowsMatch(bed, normalizedUpdated))
      ?.status,
    afterStatus: normalizedUpdated.status,
  });
  if (!matched) return board;
  return {
    ...board,
    generatedAt: new Date().toISOString(),
    units,
  };
}

/** Recompose multiple unit sections after encounter occupancy changes. */
export function rebuildFacilityBedBoardUnitsFromEncounters(input: {
  facilityId: string;
  units: readonly EncounterBedUnitCode[];
  encounters: readonly BedBoardEncounterOccupancySource[];
  previousBoard: FacilityBedBoardResponse | null;
}): FacilityBedBoardResponse | null {
  let board = input.previousBoard;
  for (const unit of input.units) {
    board = rebuildFacilityBedBoardUnitFromEncounters({
      facilityId: input.facilityId,
      unit,
      encounters: input.encounters,
      previousBoard: board,
    });
  }
  return board;
}

export function mergeBedBoardRoomUpdate(input: {
  board: FacilityBedBoardResponse | null;
  bedIndex: Map<string, FacilityBedBoardBedRow>;
  facilityId: string;
  unit: EncounterBedUnitCode;
  encounters: readonly BedBoardEncounterOccupancySource[];
}): {
  board: FacilityBedBoardResponse | null;
  bedIndex: Map<string, FacilityBedBoardBedRow>;
} {
  const nextBoard = rebuildFacilityBedBoardUnitFromEncounters({
    facilityId: input.facilityId,
    unit: input.unit,
    encounters: input.encounters,
    previousBoard: input.board,
  });
  if (!nextBoard) {
    return { board: input.board, bedIndex: input.bedIndex };
  }
  return {
    board: nextBoard,
    bedIndex: indexBedBoardByKey(nextBoard),
  };
}
