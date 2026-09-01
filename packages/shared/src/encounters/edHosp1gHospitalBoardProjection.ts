/**
 * ED.HOSP.1G — Project ED Observation/Admission placements onto the EXISTING
 * Hospitalisation board. Not a second incoming board, census, or placement engine.
 *
 * Durable IDs only (placement id, source ED encounter, receiving encounter).
 */

import { INTERNAL_PLACEMENT_TERMINAL_STATUSES, type InternalPlacementStatus } from "./internalPlacementStatusMachine.js";

export const ED_HOSP_1G_BOARD_SURFACE = {
  PLACEMENT_QUEUE: "PLACEMENT_QUEUE",
  OBSERVATION_RECEIVING: "OBSERVATION_RECEIVING",
  ADMISSIONS_RECEIVING: "ADMISSIONS_RECEIVING",
  ACTIVE_HOSPITAL: "ACTIVE_HOSPITAL",
  EXCLUDED: "EXCLUDED",
} as const;

export type EdHosp1gBoardSurface =
  (typeof ED_HOSP_1G_BOARD_SURFACE)[keyof typeof ED_HOSP_1G_BOARD_SURFACE];

export type EdHosp1gHospitalBoardProjectionInput = {
  requestedEncounterType?: string | null;
  status?: string | null;
  assignedBedKey?: string | null;
  receivingEncounterId?: string | null;
  arrivedDestinationAt?: string | Date | null;
};

export function hasCanonicalAssignedBed(assignedBedKey?: string | null): boolean {
  return String(assignedBedKey ?? "").trim().length > 0;
}

export function isEdHospHospitalDestination(requestedEncounterType?: string | null): boolean {
  const dest = String(requestedEncounterType ?? "").trim().toUpperCase();
  return dest === "OBSERVATION" || dest === "INPATIENT";
}

export function isEdHospReceivingStarted(input: {
  receivingEncounterId?: string | null;
  arrivedDestinationAt?: string | Date | null;
  status?: string | null;
}): boolean {
  if (String(input.receivingEncounterId ?? "").trim()) return true;
  if (input.arrivedDestinationAt) return true;
  return String(input.status ?? "").trim().toUpperCase() === "ARRIVED_DESTINATION";
}

/**
 * Exclusive operational surface for one InternalPlacementRequest.
 * A row belongs to at most one incoming/pending board.
 */
export function classifyEdHospHospitalBoardSurface(
  input: EdHosp1gHospitalBoardProjectionInput
): EdHosp1gBoardSurface {
  const dest = String(input.requestedEncounterType ?? "").trim().toUpperCase();
  if (dest !== "OBSERVATION" && dest !== "INPATIENT") {
    return ED_HOSP_1G_BOARD_SURFACE.EXCLUDED;
  }

  const status = String(input.status ?? "").trim().toUpperCase();
  if (INTERNAL_PLACEMENT_TERMINAL_STATUSES.has(status as InternalPlacementStatus)) {
    return ED_HOSP_1G_BOARD_SURFACE.EXCLUDED;
  }
  if (status === "DRAFT") return ED_HOSP_1G_BOARD_SURFACE.EXCLUDED;

  if (isEdHospReceivingStarted(input)) {
    return ED_HOSP_1G_BOARD_SURFACE.ACTIVE_HOSPITAL;
  }

  if (!hasCanonicalAssignedBed(input.assignedBedKey)) {
    return ED_HOSP_1G_BOARD_SURFACE.PLACEMENT_QUEUE;
  }

  if (dest === "OBSERVATION") return ED_HOSP_1G_BOARD_SURFACE.OBSERVATION_RECEIVING;
  return ED_HOSP_1G_BOARD_SURFACE.ADMISSIONS_RECEIVING;
}

export function isEdHospPlacementQueueRow(
  input: EdHosp1gHospitalBoardProjectionInput
): boolean {
  return classifyEdHospHospitalBoardSurface(input) === ED_HOSP_1G_BOARD_SURFACE.PLACEMENT_QUEUE;
}

export function isEdHospObservationReceivingRow(
  input: EdHosp1gHospitalBoardProjectionInput
): boolean {
  return (
    classifyEdHospHospitalBoardSurface(input) === ED_HOSP_1G_BOARD_SURFACE.OBSERVATION_RECEIVING
  );
}

export function isEdHospAdmissionsReceivingRow(
  input: EdHosp1gHospitalBoardProjectionInput
): boolean {
  return (
    classifyEdHospHospitalBoardSurface(input) === ED_HOSP_1G_BOARD_SURFACE.ADMISSIONS_RECEIVING
  );
}

export function countEdHospBoardSurfaces(
  rows: EdHosp1gHospitalBoardProjectionInput[]
): {
  placementQueue: number;
  observationReceiving: number;
  admissionsReceiving: number;
} {
  let placementQueue = 0;
  let observationReceiving = 0;
  let admissionsReceiving = 0;
  for (const row of rows) {
    const surface = classifyEdHospHospitalBoardSurface(row);
    if (surface === ED_HOSP_1G_BOARD_SURFACE.PLACEMENT_QUEUE) placementQueue += 1;
    else if (surface === ED_HOSP_1G_BOARD_SURFACE.OBSERVATION_RECEIVING) {
      observationReceiving += 1;
    } else if (surface === ED_HOSP_1G_BOARD_SURFACE.ADMISSIONS_RECEIVING) {
      admissionsReceiving += 1;
    }
  }
  return { placementQueue, observationReceiving, admissionsReceiving };
}
