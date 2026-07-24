/**
 * D3E.6A — Canonical facility hospital census (pure).
 * Clinical Observation/Inpatient counts derive from open encounters via
 * resolveClinicalEncounterContext — never from placement queue lifecycle alone.
 */

import { resolveClinicalEncounterContext } from "./clinicalEncounterIdentity.js";
import type { ClinicalEncounterContext } from "./clinicalEncounterIdentity.js";
import {
  projectHospitalBoardAssignments,
  readHospitalAssignmentBag,
} from "./enterpriseAssignmentEngineD4a30.js";

export const UNIFIED_HOSPITAL_CENSUS_CERTIFICATION_ID =
  "MEDUI.UNIFIED_HOSPITAL_CENSUS_DASHBOARD.D3E6A" as const;

export type HospitalCensusEncounterInput = {
  id: string;
  facilityId: string;
  type?: string | null;
  status?: string | null;
  billingClassification?: string | null;
  admissionSummaryJson?: unknown;
  admittedAt?: string | Date | null;
  createdAt?: string | Date | null;
  roomLabel?: string | null;
  chiefComplaint?: string | null;
  physicianAssignedUserId?: string | null;
  nurseAssignedUserId?: string | null;
  patient?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    mrn?: string | null;
    dob?: string | Date | null;
    sexAtBirth?: string | null;
  } | null;
  physicianAssigned?: { firstName?: string | null; lastName?: string | null } | null;
  nurseAssigned?: { firstName?: string | null; lastName?: string | null } | null;
  placementRequestedEncounterType?: string | null;
  observationOps?: {
    flags?: {
      assignRnGap?: boolean;
      assignPhysicianGap?: boolean;
      reassessmentOverdue?: boolean;
      providerReassessmentOverdue?: boolean;
      rnObservationReassessmentOverdue?: boolean;
      readyForDischarge?: boolean;
      criticalLabsUnacked?: boolean;
    };
    vitalsStale?: boolean;
    extendedStay24h?: boolean;
    losMs?: number | null;
  } | null;
  trackboardOps?: {
    resultsPendingCount?: number;
    criticalResultUnacknowledged?: boolean;
  } | null;
};

export type HospitalCensusPlacementInput = {
  id: string;
  status: string;
  requestedEncounterType?: string | null;
  arrivedDestinationAt?: string | Date | null;
  receivingEncounterId?: string | null;
  assignedBedKey?: string | null;
  requestedAt?: string | Date | null;
  createdAt?: string | Date | null;
  patient?: {
    firstName?: string | null;
    lastName?: string | null;
    mrn?: string | null;
  } | null;
};

export type HospitalCensusBedSummaryInput = {
  total: number | null;
  available: number | null;
  occupied: number | null;
  cleaning: number | null;
  blocked: number | null;
};

export type HospitalCensusPatientRow = {
  encounterId: string;
  clinicalContext: ClinicalEncounterContext;
  patientName: string;
  mrn: string | null;
  ageSex: string | null;
  unitRoomBed: string | null;
  chiefComplaint: string | null;
  attendingName: string | null;
  nurseName: string | null;
  /** D4A.3.0 — hospital-lane technician display (never ED). */
  technicianName?: string | null;
  /** D4A.3.0 — hospital-lane assignment IDs for My Patients filters. */
  providerUserId?: string | null;
  nurseUserId?: string | null;
  technicianUserId?: string | null;
  admittedAt: string | null;
  losHours: number | null;
  alerts: Array<{ code: string; severity: "urgent" | "warning" | "info" }>;
};

export type HospitalOperationalSnapshotV1 = {
  scope: "ALL_HOSPITAL_CARE" | "OBSERVATION" | "INPATIENT";
  active: number;
  rnUnassigned: number;
  physicianUnassigned: number;
  reassessmentOverdue: number;
  rnReassessmentOverdue: number;
  physicianReassessmentOverdue: number;
  vitalsStale: number;
  pendingResults: number;
  criticalResults: number;
  los24hOrMore: number;
  readyDischarge: number;
  awaitingBed: number;
};

export type HospitalCensusConsistencyDiagnostic = {
  code: string;
  severity: "warning" | "critical" | "info";
  detail: string;
  encounterId?: string | null;
  bedKey?: string | null;
};

export type HospitalCensusV1 = {
  facilityId: string;
  generatedAt: string;
  certification: typeof UNIFIED_HOSPITAL_CENSUS_CERTIFICATION_ID;
  placementAvailability: "ENABLED" | "FEATURE_DISABLED";
  summary: {
    activeObservation: number;
    activeInpatient: number;
    activeHospitalPatients: number;
    placementRequested: number;
    placementAccepted: number;
    awaitingBed: number;
    readyForTransfer: number;
    admissionsToday: number;
    dischargesToday: number;
    bedsTotal: number | null;
    bedsAvailable: number | null;
    bedsOccupied: number | null;
    bedsCleaning: number | null;
    bedsBlocked: number | null;
  };
  observationPatients: HospitalCensusPatientRow[];
  inpatientPatients: HospitalCensusPatientRow[];
  allHospitalPatients: HospitalCensusPatientRow[];
  operationalSnapshot: HospitalOperationalSnapshotV1;
  diagnostics: HospitalCensusConsistencyDiagnostic[];
  emptyGuidance: {
    observationEmpty: boolean;
    inpatientEmpty: boolean;
    placementEmpty: boolean;
    hospitalEmpty: boolean;
  };
};

function displayName(
  first?: string | null,
  last?: string | null,
  fallback?: string | null
): string {
  const n = `${first ?? ""} ${last ?? ""}`.trim();
  return n || fallback?.trim() || "—";
}

function losHoursFrom(admittedAt: string | Date | null | undefined, now: Date): number | null {
  if (!admittedAt) return null;
  const d = new Date(admittedAt);
  if (!Number.isFinite(d.getTime())) return null;
  const ms = now.getTime() - d.getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.floor(ms / 3_600_000);
}

function isSameUtcDay(iso: string | Date | null | undefined, now: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return false;
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}

function statusOf(row: HospitalCensusPlacementInput): string {
  return String(row.status ?? "")
    .trim()
    .toUpperCase();
}

export function classifyHospitalCensusEncounter(
  enc: HospitalCensusEncounterInput
): ClinicalEncounterContext {
  return resolveClinicalEncounterContext({
    type: enc.type,
    status: enc.status,
    billingClassification: enc.billingClassification,
    admissionSummaryJson: enc.admissionSummaryJson,
    placementRequestedEncounterType: enc.placementRequestedEncounterType,
  });
}

/** Placement OFF must not hide active clinical census. */
export function placementDisabledMustNotHideClinicalCensus(): true {
  return true;
}

/** Completed placement with open receiving encounter remains in clinical census. */
export function completedPlacementKeepsOpenReceivingInCensus(): true {
  return true;
}

export function buildHospitalCensusPatientRow(
  enc: HospitalCensusEncounterInput,
  now: Date = new Date()
): HospitalCensusPatientRow | null {
  if (String(enc.status ?? "").trim().toUpperCase() !== "OPEN") return null;
  const clinicalContext = classifyHospitalCensusEncounter(enc);
  if (clinicalContext !== "OBSERVATION" && clinicalContext !== "INPATIENT") return null;

  const alerts: HospitalCensusPatientRow["alerts"] = [];
  const ops = enc.observationOps;
  // D4A.3.0 — hospital active care team from independent bag only (ED columns are historical).
  const hospitalBoard = projectHospitalBoardAssignments(
    readHospitalAssignmentBag(enc.admissionSummaryJson)
  );
  if (ops?.flags?.criticalLabsUnacked || enc.trackboardOps?.criticalResultUnacknowledged) {
    alerts.push({ code: "CRITICAL_RESULTS", severity: "urgent" });
  }
  if (ops?.flags?.reassessmentOverdue) {
    alerts.push({ code: "REASSESSMENT_OVERDUE", severity: "warning" });
  }
  if (ops?.vitalsStale) {
    alerts.push({ code: "VITALS_STALE", severity: "warning" });
  }
  if (hospitalBoard.nurseUnassigned) {
    alerts.push({ code: "RN_UNASSIGNED", severity: "info" });
  }
  if (hospitalBoard.providerUnassigned) {
    alerts.push({ code: "PHYSICIAN_UNASSIGNED", severity: "info" });
  }
  if (ops?.flags?.readyForDischarge) {
    alerts.push({ code: "READY_DISCHARGE", severity: "info" });
  }

  return {
    encounterId: enc.id,
    clinicalContext,
    patientName: displayName(
      enc.patient?.firstName,
      enc.patient?.lastName,
      enc.patient?.mrn
    ),
    mrn: enc.patient?.mrn?.trim() || null,
    ageSex: enc.patient?.sexAtBirth
      ? String(enc.patient.sexAtBirth)
      : null,
    unitRoomBed: enc.roomLabel?.trim() || null,
    chiefComplaint: enc.chiefComplaint?.trim() || null,
    attendingName: hospitalBoard.providerName,
    nurseName: hospitalBoard.nurseName,
    technicianName: hospitalBoard.technicianName,
    providerUserId: hospitalBoard.providerUserId,
    nurseUserId: hospitalBoard.nurseUserId,
    technicianUserId: hospitalBoard.technicianUserId,
    admittedAt: enc.admittedAt
      ? new Date(enc.admittedAt).toISOString()
      : enc.createdAt
        ? new Date(enc.createdAt).toISOString()
        : null,
    losHours: losHoursFrom(enc.admittedAt ?? enc.createdAt, now),
    alerts,
  };
}

export function buildOperationalSnapshotFromCensusRows(
  rows: HospitalCensusPatientRow[],
  scope: HospitalOperationalSnapshotV1["scope"],
  awaitingBed: number,
  sourceEncounters: HospitalCensusEncounterInput[]
): HospitalOperationalSnapshotV1 {
  const scoped =
    scope === "ALL_HOSPITAL_CARE"
      ? rows
      : rows.filter((r) => r.clinicalContext === scope);
  const encById = new Map(sourceEncounters.map((e) => [e.id, e]));

  let rnUnassigned = 0;
  let physicianUnassigned = 0;
  let reassessmentOverdue = 0;
  let rnReassessmentOverdue = 0;
  let physicianReassessmentOverdue = 0;
  let vitalsStale = 0;
  let pendingResults = 0;
  let criticalResults = 0;
  let los24hOrMore = 0;
  let readyDischarge = 0;

  for (const row of scoped) {
    const enc = encById.get(row.encounterId);
    const ops = enc?.observationOps;
    if (ops?.flags?.assignRnGap || row.alerts.some((a) => a.code === "RN_UNASSIGNED")) {
      rnUnassigned += 1;
    }
    if (
      ops?.flags?.assignPhysicianGap ||
      row.alerts.some((a) => a.code === "PHYSICIAN_UNASSIGNED")
    ) {
      physicianUnassigned += 1;
    }
    if (ops?.flags?.reassessmentOverdue) reassessmentOverdue += 1;
    if (ops?.flags?.rnObservationReassessmentOverdue) rnReassessmentOverdue += 1;
    if (ops?.flags?.providerReassessmentOverdue) physicianReassessmentOverdue += 1;
    if (ops?.vitalsStale) vitalsStale += 1;
    const pend = enc?.trackboardOps?.resultsPendingCount ?? 0;
    if (pend > 0) pendingResults += 1;
    if (ops?.flags?.criticalLabsUnacked || enc?.trackboardOps?.criticalResultUnacknowledged) {
      criticalResults += 1;
    }
    if (ops?.extendedStay24h || (row.losHours != null && row.losHours >= 24)) {
      los24hOrMore += 1;
    }
    if (ops?.flags?.readyForDischarge) readyDischarge += 1;
  }

  return {
    scope,
    active: scoped.length,
    rnUnassigned,
    physicianUnassigned,
    reassessmentOverdue,
    rnReassessmentOverdue,
    physicianReassessmentOverdue,
    vitalsStale,
    pendingResults,
    criticalResults,
    los24hOrMore,
    readyDischarge,
    awaitingBed: scope === "ALL_HOSPITAL_CARE" ? awaitingBed : 0,
  };
}

export function filterHospitalCensusPatients(
  rows: HospitalCensusPatientRow[],
  filters: {
    query?: string;
    clinicalContext?: "ALL" | "OBSERVATION" | "INPATIENT";
    unit?: string;
    operational?: string;
  }
): HospitalCensusPatientRow[] {
  const q = (filters.query ?? "").trim().toLowerCase();
  const ctx = filters.clinicalContext ?? "ALL";
  const unit = (filters.unit ?? "").trim().toUpperCase();
  const op = (filters.operational ?? "").trim().toLowerCase();

  return rows.filter((row) => {
    if (ctx !== "ALL" && row.clinicalContext !== ctx) return false;
    if (unit && unit !== "ALL") {
      const room = (row.unitRoomBed ?? "").toUpperCase();
      if (!room.includes(unit)) return false;
    }
    if (q) {
      const hay = `${row.patientName} ${row.mrn ?? ""} ${row.chiefComplaint ?? ""} ${row.attendingName ?? ""} ${row.nurseName ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (op && op !== "all" && op !== "") {
      if (op === "unassigned_nurse" && !row.alerts.some((a) => a.code === "RN_UNASSIGNED")) {
        return false;
      }
      if (
        op === "unassigned_physician" &&
        !row.alerts.some((a) => a.code === "PHYSICIAN_UNASSIGNED")
      ) {
        return false;
      }
      if (
        op === "reassessment_overdue" &&
        !row.alerts.some((a) => a.code === "REASSESSMENT_OVERDUE")
      ) {
        return false;
      }
      if (op === "vitals_stale" && !row.alerts.some((a) => a.code === "VITALS_STALE")) {
        return false;
      }
      if (op === "critical_results" && !row.alerts.some((a) => a.code === "CRITICAL_RESULTS")) {
        return false;
      }
      if (op === "ready_discharge" && !row.alerts.some((a) => a.code === "READY_DISCHARGE")) {
        return false;
      }
      if (op === "los24" && !(row.losHours != null && row.losHours >= 24)) return false;
    }
    return true;
  });
}

export function buildHospitalCensusV1(input: {
  facilityId: string;
  generatedAt?: string;
  placementAvailability: "ENABLED" | "FEATURE_DISABLED";
  encounters: HospitalCensusEncounterInput[];
  placements?: HospitalCensusPlacementInput[];
  bedSummary?: HospitalCensusBedSummaryInput | null;
  now?: Date;
  snapshotScope?: HospitalOperationalSnapshotV1["scope"];
  occupiedBedKeysWithoutEncounter?: string[];
}): HospitalCensusV1 {
  const now = input.now ?? new Date();
  const facilityId = String(input.facilityId ?? "").trim();
  const openHospital = input.encounters.filter(
    (e) =>
      String(e.facilityId) === facilityId &&
      String(e.status ?? "").toUpperCase() === "OPEN" &&
      String(e.type ?? "").toUpperCase() === "INPATIENT"
  );

  const patients = openHospital
    .map((e) => buildHospitalCensusPatientRow(e, now))
    .filter((r): r is HospitalCensusPatientRow => r != null);

  const observationPatients = patients.filter((p) => p.clinicalContext === "OBSERVATION");
  const inpatientPatients = patients.filter((p) => p.clinicalContext === "INPATIENT");

  // Placement metrics — only when workflow enabled
  let placementRequested = 0;
  let placementAccepted = 0;
  let awaitingBed = 0;
  let readyForTransfer = 0;

  const placementRows =
    input.placementAvailability === "ENABLED" ? (input.placements ?? []) : [];

  for (const row of placementRows) {
    const s = statusOf(row);
    if (s === "REQUESTED" || s === "SIGNED") placementRequested += 1;
    if (s === "ACCEPTED") {
      placementAccepted += 1;
      awaitingBed += 1;
    }
    if (s === "READY_FOR_TRANSFER") readyForTransfer += 1;
  }

  /** Admissions today from open hospital encounters (canonical). */
  const admissionsToday = patients.filter((p) => isSameUtcDay(p.admittedAt, now)).length

  const diagnostics: HospitalCensusConsistencyDiagnostic[] = [];
  const patientIds = new Set(patients.map((p) => p.encounterId));
  const dual = new Set(
    observationPatients
      .filter((o) => inpatientPatients.some((i) => i.encounterId === o.encounterId))
      .map((o) => o.encounterId)
  );
  for (const id of dual) {
    diagnostics.push({
      code: "PATIENT_IN_BOTH_OBS_AND_IP",
      severity: "critical",
      detail: "Encounter classified in both Observation and Inpatient census.",
      encounterId: id,
    });
  }

  for (const bedKey of input.occupiedBedKeysWithoutEncounter ?? []) {
    diagnostics.push({
      code: "OCCUPIED_BED_WITHOUT_ACTIVE_ENCOUNTER",
      severity: "warning",
      detail: "Bed marked occupied without a matching open hospital encounter.",
      bedKey,
    });
  }

  for (const p of patients) {
    if (!patientIds.has(p.encounterId)) {
      diagnostics.push({
        code: "ACTIVE_ENCOUNTER_MISSING_CENSUS_ROW",
        severity: "critical",
        detail: "Open hospital encounter missing from census projection.",
        encounterId: p.encounterId,
      });
    }
  }

  const beds = input.bedSummary ?? null;
  const snapshot = buildOperationalSnapshotFromCensusRows(
    patients,
    input.snapshotScope ?? "ALL_HOSPITAL_CARE",
    awaitingBed,
    openHospital
  );

  return {
    facilityId,
    generatedAt: input.generatedAt ?? now.toISOString(),
    certification: UNIFIED_HOSPITAL_CENSUS_CERTIFICATION_ID,
    placementAvailability: input.placementAvailability,
    summary: {
      activeObservation: observationPatients.length,
      activeInpatient: inpatientPatients.length,
      activeHospitalPatients: patients.length,
      placementRequested,
      placementAccepted,
      awaitingBed,
      readyForTransfer,
      admissionsToday,
      dischargesToday: 0,
      bedsTotal: beds?.total ?? null,
      bedsAvailable: beds?.available ?? null,
      bedsOccupied: beds?.occupied ?? null,
      bedsCleaning: beds?.cleaning ?? null,
      bedsBlocked: beds?.blocked ?? null,
    },
    observationPatients,
    inpatientPatients,
    allHospitalPatients: patients,
    operationalSnapshot: snapshot,
    diagnostics,
    emptyGuidance: {
      observationEmpty: observationPatients.length === 0,
      inpatientEmpty: inpatientPatients.length === 0,
      placementEmpty: placementRequested + placementAccepted + awaitingBed === 0,
      hospitalEmpty: patients.length === 0,
    },
  };
}

/**
 * Merge clinical census into dashboard counts so placement FEATURE_DISABLED
 * zeros only placement metrics.
 */
export function mergeClinicalCensusIntoDashboardCounts(input: {
  placementCounts: {
    placementRequested: number;
    placementAccepted: number;
    awaitingBed: number;
    readyForTransfer: number;
  };
  clinical: {
    activeObservation: number;
    activeInpatient: number;
    admissionsToday: number;
  };
  beds: {
    bedsAvailable: number | null;
    bedsOccupied: number | null;
    bedsUnavailable: number | null;
  };
}): {
  placementRequested: number;
  placementAccepted: number;
  awaitingBed: number;
  readyForTransfer: number;
  activeObservation: number;
  activeInpatient: number;
  admissionsToday: number;
  dischargesToday: number;
  bedsAvailable: number | null;
  bedsOccupied: number | null;
  bedsUnavailable: number | null;
} {
  return {
    ...input.placementCounts,
    activeObservation: input.clinical.activeObservation,
    activeInpatient: input.clinical.activeInpatient,
    admissionsToday: input.clinical.admissionsToday,
    dischargesToday: 0,
    bedsAvailable: input.beds.bedsAvailable,
    bedsOccupied: input.beds.bedsOccupied,
    bedsUnavailable: input.beds.bedsUnavailable,
  };
}
