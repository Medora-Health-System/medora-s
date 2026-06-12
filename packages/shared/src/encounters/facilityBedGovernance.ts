import {
  getNextAvailableSharedRoomLabel,
  isActiveOpenEncounter,
  isEdWaitingRoomLabel,
  normalizeRoomLabel,
  resolveEdRoomAssignmentForSave,
  type EdRoomOccupancyOverride,
  type EdRoomOccupancyRow,
} from "./edRoomLabel.js";
import type { BedOperationalStatus } from "./bedOperationalStatus.js";
import {
  buildRoomLabelForStorage,
  normalizeEncounterRoomUnitCodeInput,
  parseGovernedRoomStorage,
  resolveEncounterCareUnit,
  type EncounterCareUnitCode,
} from "./governedRoomLabel.js";

export type { BedOperationalStatus };
export {
  BED_OPERATIONAL_STATUSES,
  BED_STATUS_BLOCKS_ASSIGNMENT_CODE,
  BED_STATUS_UPDATE_EVENT,
  FACILITY_BED_ENTITY_TYPE,
} from "./bedOperationalStatus.js";

export const ENCOUNTER_BED_UNIT_CODES = ["ED", "OBS", "MS", "ICU"] as const;

export type EncounterBedUnitCode = (typeof ENCOUNTER_BED_UNIT_CODES)[number];

export const ROOM_ALREADY_OCCUPIED_CODE = "ROOM_ALREADY_OCCUPIED" as const;

export const DEFAULT_PILOT_BED_POOLS: Record<EncounterBedUnitCode, readonly string[]> = {
  ED: Object.freeze(Array.from({ length: 30 }, (_, i) => String(i + 1))),
  OBS: Object.freeze(Array.from({ length: 10 }, (_, i) => String(i + 1))),
  MS: Object.freeze(Array.from({ length: 30 }, (_, i) => String(i + 1))),
  ICU: Object.freeze(Array.from({ length: 12 }, (_, i) => String(i + 1))),
};

/** Normalize unit aliases to governed bed units (ED/OBS/MS/ICU only). */
export function normalizeBedUnitCode(input: unknown): EncounterBedUnitCode | null {
  const normalized = normalizeEncounterRoomUnitCodeInput(input);
  if (!normalized) return null;
  if ((ENCOUNTER_BED_UNIT_CODES as readonly string[]).includes(normalized)) {
    return normalized as EncounterBedUnitCode;
  }
  return null;
}

/** Internal storage key for occupancy checks, e.g. `ED:2`. */
export function buildCanonicalBedKey(unit: EncounterBedUnitCode, room: string): string {
  const normalized = normalizeRoomLabel(room);
  return `${unit}:${normalized}`;
}

export function parseCanonicalBedKey(
  key: string
): { unit: EncounterBedUnitCode; room: string } | null {
  const trimmed = key.trim();
  const sep = trimmed.indexOf(":");
  if (sep <= 0) return null;
  const unit = normalizeBedUnitCode(trimmed.slice(0, sep));
  const room = normalizeRoomLabel(trimmed.slice(sep + 1));
  if (!unit || !room) return null;
  return { unit, room };
}

/** User-facing governed bed label, e.g. `ED-2`. */
export function formatCanonicalBedDisplay(
  unitOrKey: EncounterBedUnitCode | string,
  room?: string
): string {
  if (room !== undefined) {
    const unit = normalizeBedUnitCode(unitOrKey);
    const normalizedRoom = normalizeRoomLabel(room);
    return unit ? `${unit}-${normalizedRoom}` : normalizedRoom;
  }
  const parsed = parseCanonicalBedKey(unitOrKey);
  if (!parsed) return unitOrKey;
  return `${parsed.unit}-${parsed.room}`;
}

export function validateBedInPool(unit: EncounterBedUnitCode, room: string): boolean {
  const normalized = normalizeRoomLabel(room);
  if (!normalized) return false;
  return DEFAULT_PILOT_BED_POOLS[unit].includes(normalized);
}

export function resolveEncounterCanonicalBedKey(encounterLike: {
  roomLabel?: string | null;
  type?: string | null;
  unitCode?: string | null;
  admissionSummaryJson?: unknown;
}): string | null {
  const parsed = parseGovernedRoomStorage(encounterLike.roomLabel);
  if (parsed.isWaitingRoom || !parsed.roomNumber) return null;

  const unit =
    parsed.embeddedUnit && normalizeBedUnitCode(parsed.embeddedUnit)
      ? (normalizeBedUnitCode(parsed.embeddedUnit) as EncounterBedUnitCode)
      : normalizeBedUnitCode(
          resolveEncounterCareUnit({
            encounterType: encounterLike.type,
            unitCode: encounterLike.unitCode,
            admissionSummaryJson: encounterLike.admissionSummaryJson,
          })
        );

  if (!unit) return null;
  return buildCanonicalBedKey(unit, parsed.roomNumber);
}

export type BedOccupancyRow = EdRoomOccupancyRow & {
  type?: string | null;
  admissionSummaryJson?: unknown;
  patientFirstName?: string | null;
  patientLastName?: string | null;
};

export type BedOccupancyConflict = {
  occupyingEncounterId: string;
  canonicalBedKey: string;
  occupiedRoom: string;
  occupiedByPatientName?: string | null;
  requestedRoom: string;
  suggestedRoom: string;
};

function rowMatchesFacility(row: BedOccupancyRow, facilityId?: string): boolean {
  if (!facilityId?.trim()) return true;
  const rowFacility = row.facilityId?.trim();
  if (!rowFacility) return true;
  return rowFacility === facilityId.trim();
}

function formatPatientName(row: BedOccupancyRow): string | null {
  const first = row.patientFirstName?.trim() ?? "";
  const last = row.patientLastName?.trim() ?? "";
  const full = `${first} ${last}`.trim();
  return full || null;
}

function resolveRowCanonicalBedKey(row: BedOccupancyRow): string | null {
  return resolveEncounterCanonicalBedKey({
    roomLabel: row.roomLabel,
    type: row.type,
    admissionSummaryJson: row.admissionSummaryJson,
  });
}

function collectOccupiedStorageLabelsForUnit(
  unit: EncounterBedUnitCode,
  encounters: BedOccupancyRow[],
  facilityId?: string
): string[] {
  return encounters
    .filter((row) => isActiveOpenEncounter(row) && rowMatchesFacility(row, facilityId))
    .filter((row) => {
      const key = resolveRowCanonicalBedKey(row);
      return key?.startsWith(`${unit}:`) ?? false;
    })
    .map((row) => {
      const parsed = parseGovernedRoomStorage(row.roomLabel);
      return parsed.roomNumber ?? normalizeRoomLabel(row.roomLabel);
    })
    .filter((label) => label.length > 0);
}

/**
 * Returns a conflict when another open encounter in the same facility holds the same canonical bed.
 * Closed encounters, waiting room, and empty rooms are excluded by callers.
 */
export function findBedOccupancyConflict(
  target: {
    unit: EncounterBedUnitCode;
    room: string;
    storageRoomLabel?: string | null;
  },
  encounters: BedOccupancyRow[],
  options?: { excludeEncounterId?: string; facilityId?: string }
): BedOccupancyConflict | null {
  const normalizedRoom = normalizeRoomLabel(target.room);
  if (!normalizedRoom || isEdWaitingRoomLabel(normalizedRoom)) return null;

  const canonicalBedKey = buildCanonicalBedKey(target.unit, normalizedRoom);
  const excludeId = options?.excludeEncounterId?.trim();
  const facilityId = options?.facilityId?.trim();

  for (const row of encounters) {
    if (!isActiveOpenEncounter(row)) continue;
    if (!rowMatchesFacility(row, facilityId)) continue;
    if (excludeId && row.id === excludeId) continue;

    const rowKey = resolveRowCanonicalBedKey(row);
    if (rowKey !== canonicalBedKey) continue;

    const occupiedLabels = collectOccupiedStorageLabelsForUnit(target.unit, encounters, facilityId);
    const suggestedRoom =
      target.unit === "ED"
        ? getNextAvailableSharedRoomLabel(normalizedRoom, occupiedLabels)
        : normalizedRoom;

    return {
      occupyingEncounterId: row.id,
      canonicalBedKey,
      occupiedRoom: formatCanonicalBedDisplay(canonicalBedKey),
      occupiedByPatientName: formatPatientName(row),
      requestedRoom: target.storageRoomLabel ?? normalizedRoom,
      suggestedRoom,
    };
  }

  return null;
}

export type ResolveBedAssignmentInput = {
  facilityId: string;
  encounterId?: string;
  encounterType?: string | null;
  unitCode?: EncounterCareUnitCode | EncounterBedUnitCode | null;
  currentRoomLabel?: string | null;
  requestedRoomRaw: string | null | undefined;
  confirmOccupiedRoomAssignment?: boolean;
  roomOccupancyOverride?: EdRoomOccupancyOverride | null;
  openEncounters: BedOccupancyRow[];
};

export type ResolveBedAssignmentResult =
  | { ok: true; roomLabel: string | null }
  | { ok: false; conflict: BedOccupancyConflict };

/**
 * Authoritative bed assignment resolver for governed units (K.10B.10B M2).
 * ED suffix-sharing behavior is preserved via `resolveEdRoomAssignmentForSave`.
 */
export function resolveBedAssignmentForSave(
  input: ResolveBedAssignmentInput
): ResolveBedAssignmentResult {
  const unit = normalizeBedUnitCode(input.unitCode);
  const encounterType = (input.encounterType ?? "").trim().toUpperCase();

  const storageLabel =
    input.requestedRoomRaw === null || input.requestedRoomRaw === undefined
      ? null
      : buildRoomLabelForStorage({
          room: input.requestedRoomRaw,
          unitCode: (unit ?? input.unitCode) as EncounterCareUnitCode | null,
          encounterType: input.encounterType,
        });

  const currentNormalized = (input.currentRoomLabel ?? "").trim();
  const nextNormalized = (storageLabel ?? "").trim();
  if (currentNormalized === nextNormalized) {
    return { ok: true, roomLabel: storageLabel };
  }

  if (!storageLabel || isEdWaitingRoomLabel(storageLabel)) {
    if (encounterType === "EMERGENCY" || unit === "ED") {
      const edResolved = resolveEdRoomAssignmentForSave({
        facilityId: input.facilityId,
        encounterId: input.encounterId,
        currentRoomLabel: input.currentRoomLabel,
        requestedRoomRaw: storageLabel,
        confirmOccupiedRoomAssignment: input.confirmOccupiedRoomAssignment,
        roomOccupancyOverride: input.roomOccupancyOverride ?? null,
        openEncounters: input.openEncounters,
      });
      if (!edResolved.ok) {
        const conflict = findBedOccupancyConflictFromEdConflict(edResolved.conflict, input, unit ?? "ED");
        return conflict ? { ok: false, conflict } : { ok: false, conflict: buildFallbackConflict(input, unit ?? "ED") };
      }
      return { ok: true, roomLabel: edResolved.roomLabel };
    }
    return { ok: true, roomLabel: storageLabel };
  }

  if (!unit) {
    return { ok: true, roomLabel: storageLabel };
  }

  const parsed = parseGovernedRoomStorage(storageLabel);
  const roomNumber = parsed.roomNumber ?? normalizeRoomLabel(storageLabel);
  if (!roomNumber || isEdWaitingRoomLabel(roomNumber)) {
    return { ok: true, roomLabel: storageLabel };
  }

  if (!validateBedInPool(unit, roomNumber)) {
    return { ok: true, roomLabel: storageLabel };
  }

  if (unit === "ED" || encounterType === "EMERGENCY") {
    const edResolved = resolveEdRoomAssignmentForSave({
      facilityId: input.facilityId,
      encounterId: input.encounterId,
      currentRoomLabel: input.currentRoomLabel,
      requestedRoomRaw: storageLabel,
      confirmOccupiedRoomAssignment: input.confirmOccupiedRoomAssignment,
      roomOccupancyOverride: input.roomOccupancyOverride ?? null,
      openEncounters: input.openEncounters,
    });
    if (!edResolved.ok) {
      const mapped = findBedOccupancyConflictFromEdConflict(edResolved.conflict, input, "ED");
      if (mapped) return { ok: false, conflict: mapped };
    } else {
      return { ok: true, roomLabel: edResolved.roomLabel };
    }
  }

  const options = {
    excludeEncounterId: input.encounterId,
    facilityId: input.facilityId,
  };
  const conflict = findBedOccupancyConflict(
    { unit, room: roomNumber, storageRoomLabel: storageLabel },
    input.openEncounters,
    options
  );
  if (!conflict) {
    return { ok: true, roomLabel: storageLabel };
  }

  const wantsOverride =
    input.confirmOccupiedRoomAssignment === true || input.roomOccupancyOverride != null;
  if (!wantsOverride) {
    return { ok: false, conflict };
  }

  const overrideRequested = normalizeRoomLabel(
    input.roomOccupancyOverride?.requestedRoom ?? roomNumber
  );
  const acceptedRoom = normalizeRoomLabel(
    input.roomOccupancyOverride?.acceptedRoom ?? conflict.suggestedRoom
  );
  if (overrideRequested && overrideRequested !== roomNumber) {
    return { ok: false, conflict };
  }

  if (acceptedRoom !== roomNumber) {
    const acceptedConflict = findBedOccupancyConflict(
      { unit, room: acceptedRoom, storageRoomLabel: buildRoomLabelForStorage({ room: acceptedRoom, unitCode: unit, encounterType: input.encounterType }) },
      input.openEncounters,
      options
    );
    if (acceptedConflict) {
      return { ok: false, conflict: acceptedConflict };
    }
    return {
      ok: true,
      roomLabel: buildRoomLabelForStorage({
        room: acceptedRoom,
        unitCode: unit,
        encounterType: input.encounterType,
      }),
    };
  }

  return { ok: true, roomLabel: storageLabel };
}

function findBedOccupancyConflictFromEdConflict(
  edConflict: { occupyingEncounterId: string; requestedRoom: string; suggestedRoom: string },
  input: ResolveBedAssignmentInput,
  unit: EncounterBedUnitCode
): BedOccupancyConflict | null {
  const occupying = input.openEncounters.find((row) => row.id === edConflict.occupyingEncounterId);
  const canonicalBedKey = buildCanonicalBedKey(unit, edConflict.requestedRoom);
  return {
    occupyingEncounterId: edConflict.occupyingEncounterId,
    canonicalBedKey,
    occupiedRoom: formatCanonicalBedDisplay(canonicalBedKey),
    occupiedByPatientName: occupying ? formatPatientName(occupying) : null,
    requestedRoom: edConflict.requestedRoom,
    suggestedRoom: edConflict.suggestedRoom,
  };
}

function buildFallbackConflict(
  input: ResolveBedAssignmentInput,
  unit: EncounterBedUnitCode
): BedOccupancyConflict {
  const room = normalizeRoomLabel(input.requestedRoomRaw ?? "");
  const canonicalBedKey = buildCanonicalBedKey(unit, room || "unknown");
  return {
    occupyingEncounterId: "",
    canonicalBedKey,
    occupiedRoom: formatCanonicalBedDisplay(canonicalBedKey),
    requestedRoom: room,
    suggestedRoom: room,
  };
}
