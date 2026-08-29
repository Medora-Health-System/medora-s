import {
  buildCanonicalBedKey,
  DEFAULT_PILOT_BED_POOLS,
  formatCanonicalBedDisplay,
  parseCanonicalBedKey,
  resolveEncounterCanonicalBedKey,
  type BedOccupancyRow,
  type EncounterBedUnitCode,
  normalizeBedUnitCode,
} from "./facilityBedGovernance.js";
import {
  resolveBedOperationalStatus,
  type BedOperationalOverlayInput,
  type BedOperationalStatus,
} from "./bedOperationalStatus.js";
import {
  buildInpatientDischargeAwareness,
  type InpatientDischargeAwarenessV1,
} from "./inpatientDischargeAwarenessInpDis1h.js";

export type BedBoardOccupancyRow = BedOccupancyRow & {
  workflowState?: string | null;
  disposition?: string | null;
  /** INP.DIS.1H — used only to derive provider discharge awareness (no PHI narrative on board). */
  dischargeSummaryJson?: unknown;
  patientMrn?: string | null;
  patientDob?: string | Date | null;
  patientSexAtBirth?: string | null;
  patientSex?: string | null;
};

export type BedOperationalOverlayRecord = BedOperationalOverlayInput & {
  bedKey: string;
  bedDisplay?: string | null;
  unitCode?: EncounterBedUnitCode | null;
  room?: string | null;
  reasonCode?: string | null;
  reasonText?: string | null;
};

export type ComposedBedBoardRow = {
  bedKey: string;
  display: string;
  room: string;
  unitCode: EncounterBedUnitCode;
  status: BedOperationalStatus;
  statusSource: "derived" | "operational";
  occupantEncounterId: string | null;
  occupantPatientName: string | null;
  occupantMrn: string | null;
  /** Age in whole years when DOB known — display aid for occupied beds. */
  occupantAgeYears?: number | null;
  occupantSex?: string | null;
  /** INP.DIS.1H — provider-finalized discharge awareness for occupied tiles. */
  dischargeAwareness?: InpatientDischargeAwarenessV1 | null;
  reasonCode: string | null;
  reasonText: string | null;
  updatedAt: string | null;
};

function ageYearsFromDob(dob: string | Date | null | undefined): number | null {
  if (dob == null) return null;
  const birth = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(birth.getTime()) || birth.getTime() > Date.now()) return null;
  return Math.floor((Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

export type ComposedBedBoardUnit = {
  unitCode: EncounterBedUnitCode;
  beds: ComposedBedBoardRow[];
};

export type ComposedFacilityBedBoard = {
  facilityId: string;
  generatedAt: string;
  units: ComposedBedBoardUnit[];
};

function formatPatientName(row: BedBoardOccupancyRow): string | null {
  const first = row.patientFirstName?.trim() ?? "";
  const last = row.patientLastName?.trim() ?? "";
  const full = `${first} ${last}`.trim();
  return full || null;
}

function indexOccupantsByBedKey(
  encounters: BedBoardOccupancyRow[]
): Map<string, BedBoardOccupancyRow> {
  const map = new Map<string, BedBoardOccupancyRow>();
  for (const row of encounters) {
    const bedKey = resolveEncounterCanonicalBedKey({
      roomLabel: row.roomLabel,
      type: row.type,
      admissionSummaryJson: row.admissionSummaryJson,
    });
    if (!bedKey) continue;
    if (!map.has(bedKey)) {
      map.set(bedKey, row);
    }
  }
  return map;
}

export function composeUnitBedBoard(input: {
  unitCode: EncounterBedUnitCode;
  encounters: BedBoardOccupancyRow[];
  overlays: Map<string, BedOperationalOverlayRecord>;
}): ComposedBedBoardRow[] {
  const occupants = indexOccupantsByBedKey(input.encounters);
  const rooms = DEFAULT_PILOT_BED_POOLS[input.unitCode];

  return rooms.map((room) => {
    const bedKey = buildCanonicalBedKey(input.unitCode, room);
    const display = formatCanonicalBedDisplay(bedKey);
    const overlay = input.overlays.get(bedKey) ?? null;
    const occupant = occupants.get(bedKey) ?? null;
    const dischargeAwareness = occupant
      ? buildInpatientDischargeAwareness({
          dischargeSummaryJson: occupant.dischargeSummaryJson,
          encounterStatus: occupant.status,
        })
      : null;
    const resolved = resolveBedOperationalStatus({
      operationalOverlay: overlay,
      occupant: occupant
        ? {
            encounterId: occupant.id,
            workflowState: occupant.workflowState,
            disposition: occupant.disposition,
            providerDischargeFinalized: dischargeAwareness?.providerFinalized === true,
          }
        : null,
    });

    return {
      bedKey,
      display,
      room,
      unitCode: input.unitCode,
      status: resolved.status,
      statusSource: resolved.statusSource,
      occupantEncounterId: occupant?.id ?? null,
      occupantPatientName: occupant ? formatPatientName(occupant) : null,
      occupantMrn: occupant?.patientMrn ?? null,
      occupantAgeYears: occupant ? ageYearsFromDob(occupant.patientDob) : null,
      occupantSex:
        occupant?.patientSexAtBirth?.trim() ||
        occupant?.patientSex?.trim() ||
        null,
      dischargeAwareness: dischargeAwareness ?? null,
      reasonCode: overlay?.reasonCode ?? null,
      reasonText: overlay?.reasonText ?? null,
      updatedAt: overlay?.updatedAt ?? null,
    };
  });
}

export function composeFacilityBedBoard(input: {
  facilityId: string;
  unitFilter?: EncounterBedUnitCode | null;
  encounters: BedBoardOccupancyRow[];
  overlays: Map<string, BedOperationalOverlayRecord>;
  generatedAt?: string;
}): ComposedFacilityBedBoard {
  const units = (Object.keys(DEFAULT_PILOT_BED_POOLS) as EncounterBedUnitCode[]).filter((unit) =>
    input.unitFilter ? unit === input.unitFilter : true
  );

  return {
    facilityId: input.facilityId,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    units: units.map((unitCode) => ({
      unitCode,
      beds: composeUnitBedBoard({
        unitCode,
        encounters: input.encounters,
        overlays: input.overlays,
      }),
    })),
  };
}

export function findComposedBedBoardRow(
  board: ComposedFacilityBedBoard,
  bedKey: string
): ComposedBedBoardRow | null {
  for (const unit of board.units) {
    const row = unit.beds.find((bed) => bed.bedKey === bedKey);
    if (row) return row;
  }
  return null;
}

export function parseBedKeyParam(raw: string): { bedKey: string; unit: EncounterBedUnitCode; room: string } | null {
  const parsed = parseCanonicalBedKey(decodeURIComponent(raw.trim()));
  if (!parsed) return null;
  return {
    bedKey: buildCanonicalBedKey(parsed.unit, parsed.room),
    unit: parsed.unit,
    room: parsed.room,
  };
}

export function normalizeBedBoardUnitFilter(raw: unknown): EncounterBedUnitCode | null {
  return normalizeBedUnitCode(raw);
}
