/**
 * D3E.6B — Facility-scoped clinical unit registry (pure).
 * Projects configured clinical units from existing bed pools + optional
 * development fixtures. No floor hierarchy. Placement OFF does not hide units.
 */

import {
  DEFAULT_PILOT_BED_POOLS,
  formatCanonicalBedDisplay,
  normalizeBedUnitCode,
  parseCanonicalBedKey,
  resolveEncounterCanonicalBedKey,
  type EncounterBedUnitCode,
} from "./facilityBedGovernance.js";
import { parseGovernedRoomStorage } from "./governedRoomLabel.js";
import {
  levelOfCareForUnitType,
  UNIT_BASED_HOSPITAL_NAVIGATION_CERTIFICATION_ID,
  type HospitalClinicalUnitType,
  type HospitalUnitLevelOfCare,
} from "./hospitalClinicalUnitTaxonomy.js";
import type { HospitalCensusPatientRow } from "./hospitalCensusV1.js";
import type { ComposedFacilityBedBoard } from "./bedBoardComposition.js";

export { UNIT_BASED_HOSPITAL_NAVIGATION_CERTIFICATION_ID };

export const ALL_HOSPITAL_UNITS_SELECTION_ID = "ALL_HOSPITAL_UNITS" as const;
export const AWAITING_UNIT_ASSIGNMENT_SELECTION_ID = "AWAITING_UNIT_ASSIGNMENT" as const;

export type HospitalUnitSelectionKind = "ALL" | "UNIT" | "ROOM" | "BED" | "AWAITING";

export type HospitalUnitSelection = {
  kind: HospitalUnitSelectionKind;
  unitId?: string | null;
  unitCode?: string | null;
  roomId?: string | null;
  roomCode?: string | null;
  bedKey?: string | null;
};

export type HospitalUnitBedNode = {
  id: string;
  bedKey: string;
  code: string;
  name: string;
  occupied: boolean;
  occupantEncounterId: string | null;
};

export type HospitalUnitRoomNode = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  beds: HospitalUnitBedNode[];
};

export type HospitalClinicalUnitDefinition = {
  id: string;
  code: string;
  name: string;
  unitType: HospitalClinicalUnitType;
  /** Maps to existing bed-board unit pool when present. */
  bedUnitCode: EncounterBedUnitCode | null;
  acceptsInpatient: boolean;
  acceptsObservation: boolean;
  specialty: string | null;
  /** Development-only fixture — omitted unless includeDevelopmentFixtures. */
  developmentOnly?: boolean;
};

/**
 * Pilot facility clinical units (zero-schema).
 * Production-visible units reuse DEFAULT_PILOT_BED_POOLS (MS/ICU/OBS).
 * Additional specialty units are development fixtures until admin config exists.
 */
export const DEFAULT_FACILITY_CLINICAL_UNIT_DEFINITIONS: readonly HospitalClinicalUnitDefinition[] =
  Object.freeze([
    {
      id: "unit-ms",
      code: "MS",
      name: "Medical/Surgical",
      unitType: "MEDICAL_SURGICAL",
      bedUnitCode: "MS",
      acceptsInpatient: true,
      acceptsObservation: false,
      specialty: null,
    },
    {
      id: "unit-icu",
      code: "ICU",
      name: "Intensive Care Unit",
      unitType: "ICU_GENERAL",
      bedUnitCode: "ICU",
      acceptsInpatient: true,
      acceptsObservation: false,
      specialty: "CRITICAL_CARE",
    },
    {
      id: "unit-obs",
      code: "OBS",
      name: "Observation Unit",
      unitType: "OBSERVATION",
      bedUnitCode: "OBS",
      acceptsInpatient: false,
      acceptsObservation: true,
      specialty: null,
    },
    {
      id: "unit-pcu",
      code: "PCU",
      name: "Progressive Care / Step-Down",
      unitType: "PROGRESSIVE_CARE",
      bedUnitCode: null,
      acceptsInpatient: true,
      acceptsObservation: false,
      specialty: null,
      developmentOnly: true,
    },
    {
      id: "unit-peds",
      code: "PEDS",
      name: "Pediatrics",
      unitType: "PEDIATRIC_MEDICAL",
      bedUnitCode: null,
      acceptsInpatient: true,
      acceptsObservation: false,
      specialty: "PEDIATRICS",
      developmentOnly: true,
    },
    {
      id: "unit-surg",
      code: "SURG",
      name: "Surgical Unit",
      unitType: "SURGICAL",
      bedUnitCode: null,
      acceptsInpatient: true,
      acceptsObservation: false,
      specialty: "SURGERY",
      developmentOnly: true,
    },
    {
      id: "unit-ld",
      code: "LD",
      name: "Labor and Delivery",
      unitType: "LABOR_DELIVERY",
      bedUnitCode: null,
      acceptsInpatient: true,
      acceptsObservation: false,
      specialty: "WOMENS_HEALTH",
      developmentOnly: true,
    },
  ]);

export type HospitalUnitRegistryUnit = {
  id: string;
  code: string;
  name: string;
  unitType: HospitalClinicalUnitType;
  levelOfCare: HospitalUnitLevelOfCare;
  specialty: string | null;
  active: boolean;
  acceptsInpatient: boolean;
  acceptsObservation: boolean;
  developmentOnly: boolean;
  patientCount: number;
  occupiedBedCount: number | null;
  availableBedCount: number | null;
  alertCount: number;
  rooms: HospitalUnitRoomNode[];
  /** Physical location metadata — never used as clinical tree parent. */
  physicalLocationHint: string | null;
};

export type HospitalUnitRegistryV1 = {
  facilityId: string;
  generatedAt: string;
  certification: typeof UNIT_BASED_HOSPITAL_NAVIGATION_CERTIFICATION_ID;
  placementAvailability: "ENABLED" | "FEATURE_DISABLED";
  units: HospitalUnitRegistryUnit[];
  awaitingAssignmentCount: number;
  configuration: {
    hasConfiguredUnits: boolean;
    adminConfigurationAvailable: boolean;
    developmentFixturesIncluded: boolean;
  };
};

export function resolvePatientClinicalUnitCode(input: {
  roomLabel?: string | null;
  unitCode?: string | null;
  clinicalContext?: string | null;
}): string | null {
  const explicit = input.unitCode?.trim().toUpperCase();
  if (explicit) return explicit;
  const parsed = parseGovernedRoomStorage(input.roomLabel ?? null);
  if (parsed.embeddedUnit) {
    return String(parsed.embeddedUnit).toUpperCase();
  }
  const bedKey = resolveEncounterCanonicalBedKey({
    roomLabel: input.roomLabel,
    type: input.clinicalContext === "OBSERVATION" ? "INPATIENT" : "INPATIENT",
  });
  if (bedKey) {
    const bed = parseCanonicalBedKey(bedKey);
    if (bed) return bed.unit;
  }
  return null;
}

export function enrichCensusRowUnitFields(
  row: HospitalCensusPatientRow
): HospitalCensusPatientRow & {
  clinicalUnitCode: string | null;
  roomCode: string | null;
  bedKey: string | null;
} {
  const bedKey = resolveEncounterCanonicalBedKey({
    roomLabel: row.unitRoomBed,
    type: "INPATIENT",
  });
  const parsedBed = bedKey ? parseCanonicalBedKey(bedKey) : null;
  const parsedRoom = parseGovernedRoomStorage(row.unitRoomBed);
  return {
    ...row,
    clinicalUnitCode:
      resolvePatientClinicalUnitCode({
        roomLabel: row.unitRoomBed,
        clinicalContext: row.clinicalContext,
      }) ?? null,
    roomCode: parsedBed?.room ?? parsedRoom.roomNumber ?? null,
    bedKey,
  };
}

export function filterCensusByUnitSelection(
  rows: HospitalCensusPatientRow[],
  selection: HospitalUnitSelection,
  options?: { clinicalContext?: "ALL" | "OBSERVATION" | "INPATIENT" }
): HospitalCensusPatientRow[] {
  const ctx = options?.clinicalContext ?? "ALL";
  const base =
    ctx === "ALL" ? rows : rows.filter((r) => r.clinicalContext === ctx);

  if (selection.kind === "ALL") return base;

  if (selection.kind === "AWAITING") {
    return base.filter((r) => {
      const enriched = enrichCensusRowUnitFields(r);
      return !enriched.bedKey && !enriched.roomCode;
    });
  }

  const unitCode = (selection.unitCode ?? "").trim().toUpperCase();
  const roomCode = (selection.roomCode ?? "").trim();
  const bedKey = (selection.bedKey ?? "").trim().toUpperCase();

  return base.filter((r) => {
    const enriched = enrichCensusRowUnitFields(r);
    if (unitCode && enriched.clinicalUnitCode !== unitCode) {
      // Also match roomLabel containing unit prefix (MS-1)
      const label = (r.unitRoomBed ?? "").toUpperCase();
      if (!label.startsWith(`${unitCode}-`) && !label.includes(`${unitCode}:`)) {
        return false;
      }
    }
    if (selection.kind === "ROOM" || selection.kind === "BED") {
      if (roomCode && enriched.roomCode !== roomCode) {
        const label = (r.unitRoomBed ?? "").toUpperCase();
        if (!label.includes(roomCode.toUpperCase())) return false;
      }
    }
    if (selection.kind === "BED" && bedKey) {
      if ((enriched.bedKey ?? "").toUpperCase() !== bedKey) return false;
    }
    return true;
  });
}

function buildRoomsFromBedPool(
  bedUnitCode: EncounterBedUnitCode,
  bedBoard: ComposedFacilityBedBoard | null | undefined
): HospitalUnitRoomNode[] {
  const pool = DEFAULT_PILOT_BED_POOLS[bedUnitCode] ?? [];
  const boardUnit = bedBoard?.units?.find((u) => u.unitCode === bedUnitCode);
  const byRoom = new Map<string, HospitalUnitBedNode[]>();

  for (const room of pool) {
    const bedKey = `${bedUnitCode}:${room}`;
    const boardRow = boardUnit?.beds.find((b) => b.bedKey === bedKey || b.room === room);
    const node: HospitalUnitBedNode = {
      id: `bed-${bedKey}`,
      bedKey,
      code: room,
      name: formatCanonicalBedDisplay(bedUnitCode, room),
      occupied: Boolean(boardRow?.occupantEncounterId) || boardRow?.status === "OCCUPIED",
      occupantEncounterId: boardRow?.occupantEncounterId ?? null,
    };
    const list = byRoom.get(room) ?? [];
    list.push(node);
    byRoom.set(room, list);
  }

  return Array.from(byRoom.entries()).map(([room, beds]) => ({
    id: `room-${bedUnitCode}-${room}`,
    code: room,
    name: formatCanonicalBedDisplay(bedUnitCode, room),
    active: true,
    beds,
  }));
}

function countAlertsForUnit(
  patients: HospitalCensusPatientRow[],
  unitCode: string
): number {
  return filterCensusByUnitSelection(patients, {
    kind: "UNIT",
    unitCode,
  }).reduce((n, p) => n + p.alerts.length, 0);
}

export function buildHospitalUnitRegistryV1(input: {
  facilityId: string;
  generatedAt?: string;
  placementAvailability: "ENABLED" | "FEATURE_DISABLED";
  patients: HospitalCensusPatientRow[];
  bedBoard?: ComposedFacilityBedBoard | null;
  includeDevelopmentFixtures?: boolean;
  definitions?: readonly HospitalClinicalUnitDefinition[];
  /** Specialty codes the actor may not view — filtered server-side. */
  deniedSpecialtyCodes?: readonly string[];
}): HospitalUnitRegistryV1 {
  const facilityId = String(input.facilityId ?? "").trim();
  const includeDev = Boolean(input.includeDevelopmentFixtures);
  const denied = new Set(
    (input.deniedSpecialtyCodes ?? []).map((s) => s.trim().toUpperCase())
  );
  const defs = (input.definitions ?? DEFAULT_FACILITY_CLINICAL_UNIT_DEFINITIONS).filter(
    (d) => {
      if (d.developmentOnly && !includeDev) return false;
      if (d.specialty && denied.has(d.specialty.toUpperCase())) return false;
      return true;
    }
  );

  const units: HospitalUnitRegistryUnit[] = defs.map((def) => {
    const rooms =
      def.bedUnitCode != null
        ? buildRoomsFromBedPool(def.bedUnitCode, input.bedBoard ?? null)
        : [];
    const patients = filterCensusByUnitSelection(input.patients, {
      kind: "UNIT",
      unitCode: def.code,
    });
    let occupied: number | null = null;
    let available: number | null = null;
    if (def.bedUnitCode) {
      const boardUnit = input.bedBoard?.units?.find((u) => u.unitCode === def.bedUnitCode);
      if (boardUnit) {
        occupied = boardUnit.beds.filter(
          (b) => b.status === "OCCUPIED" || Boolean(b.occupantEncounterId)
        ).length;
        available = boardUnit.beds.filter((b) => b.status === "AVAILABLE").length;
      } else if (rooms.length) {
        occupied = rooms.reduce((n, r) => n + r.beds.filter((b) => b.occupied).length, 0);
        available = rooms.reduce((n, r) => n + r.beds.filter((b) => !b.occupied).length, 0);
      }
    }

    return {
      id: def.id,
      code: def.code,
      name: def.name,
      unitType: def.unitType,
      levelOfCare: levelOfCareForUnitType(def.unitType),
      specialty: def.specialty,
      active: true,
      acceptsInpatient: def.acceptsInpatient,
      acceptsObservation: def.acceptsObservation,
      developmentOnly: Boolean(def.developmentOnly),
      patientCount: patients.length,
      occupiedBedCount: occupied,
      availableBedCount: available,
      alertCount: countAlertsForUnit(input.patients, def.code),
      rooms,
      physicalLocationHint: null,
    };
  });

  const awaitingAssignmentCount = filterCensusByUnitSelection(input.patients, {
    kind: "AWAITING",
  }).length;

  return {
    facilityId,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    certification: UNIT_BASED_HOSPITAL_NAVIGATION_CERTIFICATION_ID,
    placementAvailability: input.placementAvailability,
    units,
    awaitingAssignmentCount,
    configuration: {
      hasConfiguredUnits: units.length > 0,
      adminConfigurationAvailable: false,
      developmentFixturesIncluded: includeDev,
    },
  };
}

/** Tree must never use floor labels as primary nodes. */
export function unitTreeMustNotUseFloorHierarchy(): true {
  return true;
}

/** Placement OFF must still return configured units. */
export function unitRegistryLoadsWhenPlacementDisabled(
  registry: HospitalUnitRegistryV1
): boolean {
  return (
    registry.placementAvailability === "FEATURE_DISABLED" &&
    registry.units.length > 0
  );
}

export function selectionFromUnitDropdownValue(value: string): HospitalUnitSelection {
  const v = value.trim();
  if (!v || v === "ALL" || v === ALL_HOSPITAL_UNITS_SELECTION_ID) {
    return { kind: "ALL" };
  }
  if (v === AWAITING_UNIT_ASSIGNMENT_SELECTION_ID || v === "AWAITING") {
    return { kind: "AWAITING" };
  }
  if (v.includes(":")) {
    const bed = parseCanonicalBedKey(v);
    if (bed) {
      return {
        kind: "BED",
        unitCode: bed.unit,
        roomCode: bed.room,
        bedKey: v.toUpperCase(),
      };
    }
  }
  const roomMatch = /^([A-Z]+)-(.+)$/i.exec(v);
  if (roomMatch) {
    const unit = normalizeBedUnitCode(roomMatch[1]) ?? roomMatch[1].toUpperCase();
    return { kind: "ROOM", unitCode: unit, roomCode: roomMatch[2] };
  }
  return { kind: "UNIT", unitCode: v.toUpperCase(), unitId: v };
}

export function unitDropdownValueFromSelection(selection: HospitalUnitSelection): string {
  if (selection.kind === "ALL") return ALL_HOSPITAL_UNITS_SELECTION_ID;
  if (selection.kind === "AWAITING") return AWAITING_UNIT_ASSIGNMENT_SELECTION_ID;
  if (selection.kind === "BED" && selection.bedKey) return selection.bedKey;
  if (selection.kind === "ROOM" && selection.unitCode && selection.roomCode) {
    return `${selection.unitCode}-${selection.roomCode}`;
  }
  return selection.unitCode ?? ALL_HOSPITAL_UNITS_SELECTION_ID;
}

export function buildSelectedUnitSummary(input: {
  registry: HospitalUnitRegistryV1;
  selection: HospitalUnitSelection;
  patients: HospitalCensusPatientRow[];
  clinicalContext?: "ALL" | "OBSERVATION" | "INPATIENT";
}): {
  selection: HospitalUnitSelection;
  unit: HospitalUnitRegistryUnit | null;
  title: string;
  patientCount: number;
  occupiedBedCount: number | null;
  availableBedCount: number | null;
  rnUnassigned: number;
  physicianUnassigned: number;
  reassessmentOverdue: number;
  vitalsStale: number;
  pendingResults: number;
  criticalResults: number;
  readyDischarge: number;
  patients: HospitalCensusPatientRow[];
} {
  const patients = filterCensusByUnitSelection(
    input.patients,
    input.selection,
    { clinicalContext: input.clinicalContext }
  );
  const unit =
    input.selection.kind === "UNIT" ||
    input.selection.kind === "ROOM" ||
    input.selection.kind === "BED"
      ? input.registry.units.find(
          (u) =>
            u.code === (input.selection.unitCode ?? "").toUpperCase() ||
            u.id === input.selection.unitId
        ) ?? null
      : null;

  let title = "All Hospital Units";
  if (input.selection.kind === "AWAITING") title = "Awaiting Unit Assignment";
  else if (unit) {
    title = unit.name;
    if (input.selection.kind === "ROOM" && input.selection.roomCode) {
      title = `${unit.name} · ${input.selection.roomCode}`;
    }
    if (input.selection.kind === "BED" && input.selection.bedKey) {
      title = `${unit.name} · ${input.selection.bedKey}`;
    }
  }

  const countAlert = (code: string) =>
    patients.filter((p) => p.alerts.some((a) => a.code === code)).length;

  return {
    selection: input.selection,
    unit,
    title,
    patientCount: patients.length,
    occupiedBedCount: unit?.occupiedBedCount ?? null,
    availableBedCount: unit?.availableBedCount ?? null,
    rnUnassigned: countAlert("RN_UNASSIGNED"),
    physicianUnassigned: countAlert("PHYSICIAN_UNASSIGNED"),
    reassessmentOverdue: countAlert("REASSESSMENT_OVERDUE"),
    vitalsStale: countAlert("VITALS_STALE"),
    pendingResults: 0,
    criticalResults: countAlert("CRITICAL_RESULTS"),
    readyDischarge: countAlert("READY_DISCHARGE"),
    patients,
  };
}
