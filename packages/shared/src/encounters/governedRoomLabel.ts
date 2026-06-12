import { isEdWaitingRoomLabel, normalizeRoomLabel } from "./edRoomLabel.js";
import { isObservationShortStayEncounter } from "../observationShortStayEncounter.js";

/** Care-area unit prefix for governed room display (K.10B.10). */
export const ENCOUNTER_CARE_UNIT_CODES = ["ED", "ICU", "MS", "OBS", "LD"] as const;

export type EncounterCareUnitCode = (typeof ENCOUNTER_CARE_UNIT_CODES)[number];

export const ENCOUNTER_ROOM_CHANGE_REASON_CODES = [
  "ROOM_CHANGE",
  "TRANSFER",
  "CLEANING",
  "CLINICAL_ISOLATION",
  "OTHER",
] as const;

export type EncounterRoomChangeReasonCode = (typeof ENCOUNTER_ROOM_CHANGE_REASON_CODES)[number];

const UNIT_PREFIX_PATTERN = /^(ED|ICU|MS|OBS|LD)[-–/ ]+/i;

function parseServiceUnitToken(serviceUnit: string | null | undefined): EncounterCareUnitCode | null {
  const hay = (serviceUnit ?? "").trim().toLowerCase();
  if (!hay) return null;
  if (/\b(ed|emergency|urgent|er)\b/.test(hay)) return "ED";
  if (/\b(icu|critical care|intensive)\b/.test(hay)) return "ICU";
  if (/\b(obs|observation)\b/.test(hay)) return "OBS";
  if (/\b(l&d|labor|delivery|obstetric)\b/.test(hay)) return "LD";
  if (/\b(ms|med[\s/-]?surg|medical surgical|med-surg)\b/.test(hay)) return "MS";
  return null;
}

/** Resolve care unit for governed room labels from encounter context. Returns null when unit is unknown. */
export function resolveEncounterCareUnit(input: {
  encounterType?: string | null;
  unitCode?: string | null;
  serviceUnit?: string | null;
  admissionSummaryJson?: unknown;
  isObservationShortStay?: boolean;
}): EncounterCareUnitCode | null {
  const explicit = input.unitCode?.trim().toUpperCase();
  if (explicit && (ENCOUNTER_CARE_UNIT_CODES as readonly string[]).includes(explicit)) {
    return explicit as EncounterCareUnitCode;
  }

  const admissionObj =
    input.admissionSummaryJson && typeof input.admissionSummaryJson === "object" && !Array.isArray(input.admissionSummaryJson)
      ? (input.admissionSummaryJson as Record<string, unknown>)
      : null;
  const serviceUnit =
    typeof admissionObj?.serviceUnit === "string" ? admissionObj.serviceUnit : input.serviceUnit;
  const fromService = parseServiceUnitToken(serviceUnit);
  if (fromService) return fromService;

  const type = (input.encounterType ?? "").trim().toUpperCase();
  if (type === "EMERGENCY") return "ED";

  const obs =
    input.isObservationShortStay ??
    isObservationShortStayEncounter({
      type: input.encounterType,
      status: "OPEN",
      admissionSummaryJson: input.admissionSummaryJson,
    });
  if (type === "INPATIENT" && obs) return "OBS";
  if (type === "INPATIENT") return "MS";

  return null;
}

export type ParsedGovernedRoomStorage = {
  raw: string;
  roomNumber: string | null;
  embeddedUnit: EncounterCareUnitCode | null;
  isWaitingRoom: boolean;
};

/** Parse stored roomLabel into unit prefix and room number when present. */
export function parseGovernedRoomStorage(
  roomLabel: string | null | undefined
): ParsedGovernedRoomStorage {
  const raw = (roomLabel ?? "").trim();
  if (!raw) {
    return { raw: "", roomNumber: null, embeddedUnit: null, isWaitingRoom: false };
  }
  if (isEdWaitingRoomLabel(raw)) {
    return { raw, roomNumber: null, embeddedUnit: null, isWaitingRoom: true };
  }

  const unitMatch = UNIT_PREFIX_PATTERN.exec(raw);
  if (unitMatch) {
    const unit = unitMatch[1]!.toUpperCase() as EncounterCareUnitCode;
    const remainder = raw.slice(unitMatch[0].length).trim();
    const roomNumber = normalizeRoomLabel(remainder) || remainder || null;
    return { raw, roomNumber, embeddedUnit: unit, isWaitingRoom: false };
  }

  const normalized = normalizeRoomLabel(raw);
  return {
    raw,
    roomNumber: normalized || raw,
    embeddedUnit: null,
    isWaitingRoom: false,
  };
}

/** Build persisted roomLabel from unit + room input (ED stores bare number for occupancy). */
export function buildRoomLabelForStorage(input: {
  room: string | null | undefined;
  unitCode: EncounterCareUnitCode | null;
  encounterType?: string | null;
}): string | null {
  const roomTrim = (input.room ?? "").trim();
  if (!roomTrim) return null;

  const normalizedRoom = normalizeRoomLabel(roomTrim) || roomTrim;
  const type = (input.encounterType ?? "").trim().toUpperCase();
  const unit = input.unitCode ?? (type === "EMERGENCY" ? "ED" : type === "INPATIENT" ? "MS" : null);

  if (unit === "ED" || type === "EMERGENCY") {
    if (isEdWaitingRoomLabel(normalizedRoom)) return "WAITING_ROOM";
    return normalizedRoom.slice(0, 64);
  }

  if (!unit) {
    return normalizedRoom.slice(0, 64);
  }

  const prefixed = `${unit}-${normalizedRoom}`.slice(0, 64);
  return prefixed;
}

/** Extract room input for modal from storage + resolved unit. */
export function extractRoomInputFromStorage(
  roomLabel: string | null | undefined,
  unitCode: EncounterCareUnitCode | null
): string {
  const parsed = parseGovernedRoomStorage(roomLabel);
  if (parsed.isWaitingRoom) return "";
  if (parsed.roomNumber) return parsed.roomNumber;
  if (parsed.embeddedUnit && parsed.embeddedUnit === unitCode) return parsed.roomNumber ?? "";
  if (!parsed.embeddedUnit && unitCode === "ED") return parsed.raw;
  return parsed.roomNumber ?? parsed.raw;
}

export type GovernedRoomDisplayResult = {
  display: string;
  hasRoom: boolean;
  unit: EncounterCareUnitCode | null;
  isWaitingRoom: boolean;
};

/**
 * Single governed room label for dashboards, MAR, and headers (K.10B.10).
 * `emptyLabel` / `waitingRoomLabel` should come from i18n at call sites.
 */
export function formatGovernedRoomDisplay(input: {
  roomLabel?: string | null;
  encounterType?: string | null;
  unitCode?: string | null;
  serviceUnit?: string | null;
  admissionSummaryJson?: unknown;
  isObservationShortStay?: boolean;
  emptyLabel?: string;
  waitingRoomLabel?: string;
}): GovernedRoomDisplayResult {
  const unit = resolveEncounterCareUnit({
    encounterType: input.encounterType,
    unitCode: input.unitCode,
    serviceUnit: input.serviceUnit,
    admissionSummaryJson: input.admissionSummaryJson,
    isObservationShortStay: input.isObservationShortStay,
  });
  const parsed = parseGovernedRoomStorage(input.roomLabel);

  if (parsed.isWaitingRoom) {
    return {
      display: input.waitingRoomLabel?.trim() || "Waiting room",
      hasRoom: false,
      unit,
      isWaitingRoom: true,
    };
  }

  if (!parsed.raw) {
    return {
      display: input.emptyLabel?.trim() || "No room assigned",
      hasRoom: false,
      unit,
      isWaitingRoom: false,
    };
  }

  const roomNumber = parsed.roomNumber ?? normalizeRoomLabel(parsed.raw);
  if (!roomNumber) {
    return {
      display: input.emptyLabel?.trim() || "No room assigned",
      hasRoom: false,
      unit,
      isWaitingRoom: false,
    };
  }

  const effectiveUnit = parsed.embeddedUnit ?? unit;
  if (effectiveUnit === "MS" && unit === "MS" && !parsed.embeddedUnit && /^\d/.test(roomNumber)) {
    return {
      display: `${unit}-${roomNumber}`,
      hasRoom: true,
      unit,
      isWaitingRoom: false,
    };
  }

  if (parsed.embeddedUnit) {
    return {
      display: `${parsed.embeddedUnit}-${roomNumber}`,
      hasRoom: true,
      unit: parsed.embeddedUnit,
      isWaitingRoom: false,
    };
  }

  if (unit === "ED") {
    return {
      display: `ED-${roomNumber}`,
      hasRoom: true,
      unit,
      isWaitingRoom: false,
    };
  }

  if (unit && (ENCOUNTER_CARE_UNIT_CODES as readonly string[]).includes(unit)) {
    return {
      display: `${unit}-${roomNumber}`,
      hasRoom: true,
      unit,
      isWaitingRoom: false,
    };
  }

  return {
    display: `Room ${roomNumber}`,
    hasRoom: true,
    unit: null,
    isWaitingRoom: false,
  };
}

/** French-facing care area name for room modal (product language). */
export function encounterCareUnitDisplayNameFr(unit: EncounterCareUnitCode): string {
  switch (unit) {
    case "ED":
      return "Urgences";
    case "ICU":
      return "Soins intensifs";
    case "MS":
      return "Médecine-chirurgie";
    case "OBS":
      return "Observation";
    case "LD":
      return "Maternité";
    default:
      return "Unité de soins";
  }
}
