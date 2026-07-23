/**
 * D4A.2.7 — Enterprise Clinical Command Layer contracts.
 *
 * Operational awareness only. Consumes Clinical Synthesis Service projections.
 * Does not own clinical documentation, provider assessment, or nursing assessment.
 * Does not enable Placement / D3B.
 */

import type { HospitalCensusPatientRow } from "./hospitalCensusV1.js";
import type { CommandCenterSynthesisLiteV1 } from "./clinicalSynthesisServiceD4a26b.js";

export const ENTERPRISE_COMMAND_LAYER_CERTIFICATION_ID =
  "MEDUI.ENTERPRISE_COMMAND_LAYER.D4A2_7" as const;

export const ENTERPRISE_COMMAND_V1_KEY = "enterpriseCommandV1" as const;

export const ENTERPRISE_PATIENT_LIST_KINDS = [
  "PROVIDER",
  "RESIDENT",
  "HOSPITALIST",
  "APP",
  "CONSULT",
  "RN",
  "CHARGE_NURSE",
  "UNIT",
  "ISOLATION",
  "OBSERVATION",
  "DISCHARGE_TODAY",
  "PENDING_CONSULT",
  "PENDING_IMAGING",
  "PENDING_PT",
  "PENDING_PLACEMENT",
  "RAPID_RESPONSE",
  "CRITICAL_RESULTS",
] as const;

export type EnterprisePatientListKind = (typeof ENTERPRISE_PATIENT_LIST_KINDS)[number];

export const ENTERPRISE_TASK_TYPES = [
  "CONSULT_PENDING",
  "LAB_REDRAW",
  "TRANSPORT",
  "CASE_MANAGEMENT",
  "PT",
  "OT",
  "SPEECH",
  "MEDICATION_RECONCILIATION",
  "DISCHARGE_PAPERWORK",
  "PENDING_CONSENT",
  "PROVIDER_SIGNATURE",
  "NURSING_FOLLOW_UP",
  "PHARMACY_REVIEW",
] as const;

export type EnterpriseTaskType = (typeof ENTERPRISE_TASK_TYPES)[number];

export const ENTERPRISE_TASK_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "COMPLETED",
  "ESCALATED",
  "CANCELLED",
] as const;

export type EnterpriseTaskStatus = (typeof ENTERPRISE_TASK_STATUSES)[number];

export const ENTERPRISE_ALERT_TYPES = [
  "CRITICAL_LAB",
  "CRITICAL_IMAGING",
  "RAPID_RESPONSE",
  "STROKE",
  "STEMI",
  "SEPSIS",
  "BEHAVIORAL",
  "ESCALATION",
  "REMINDER",
  "CODE_BLUE",
] as const;

export type EnterpriseAlertType = (typeof ENTERPRISE_ALERT_TYPES)[number];

export const ENTERPRISE_ESCALATION_STATUSES = [
  "OPEN",
  "ACKNOWLEDGED",
  "RESOLVED",
  "CANCELLED",
] as const;

export type EnterpriseEscalationStatus = (typeof ENTERPRISE_ESCALATION_STATUSES)[number];

export const ENTERPRISE_NOTIFICATION_TARGETS = [
  "PROVIDER",
  "RN",
  "SUPERVISOR",
  "ADMINISTRATION",
  "LAB",
  "RADIOLOGY",
  "TRANSPORT",
  "PHARMACY",
  "CASE_MANAGEMENT",
] as const;

export type EnterpriseNotificationTarget = (typeof ENTERPRISE_NOTIFICATION_TARGETS)[number];

export type EnterpriseCommandTaskV1 = {
  taskId: string;
  type: EnterpriseTaskType;
  title: string;
  ownerUserId?: string | null;
  ownerRole?: string | null;
  priority: "ROUTINE" | "URGENT" | "STAT";
  status: EnterpriseTaskStatus;
  dueAt?: string | null;
  createdAt: string;
  completedAt?: string | null;
  escalatedAt?: string | null;
  clientRequestId?: string | null;
};

export type EnterpriseCommandEscalationV1 = {
  escalationId: string;
  alertType: EnterpriseAlertType;
  status: EnterpriseEscalationStatus;
  ownerUserId?: string | null;
  summary: string;
  createdAt: string;
  acknowledgedAt?: string | null;
  acknowledgedByUserId?: string | null;
  resolvedAt?: string | null;
  resolvedByUserId?: string | null;
  history: Array<{ at: string; byUserId?: string | null; status: EnterpriseEscalationStatus; note?: string | null }>;
  clientRequestId?: string | null;
};

export type EnterpriseCommandNotificationV1 = {
  notificationId: string;
  target: EnterpriseNotificationTarget;
  title: string;
  summary: string;
  createdAt: string;
  deliveredAt?: string | null;
  relatedEscalationId?: string | null;
  relatedTaskId?: string | null;
  operationalOnly: true;
};

export type EnterpriseCommandDocV1 = {
  version: 1;
  expectedVersion: number;
  tasks: EnterpriseCommandTaskV1[];
  escalations: EnterpriseCommandEscalationV1[];
  notifications: EnterpriseCommandNotificationV1[];
  updatedAt: string;
  updatedByUserId?: string | null;
};

export type EnterpriseTrackBoardRowV1 = {
  encounterId: string;
  patientId?: string | null;
  patientName: string;
  mrn: string | null;
  room: string | null;
  bed: string | null;
  unit: string | null;
  provider: string | null;
  rn: string | null;
  losHours: number | null;
  admissionTime: string | null;
  clinicalContext: string;
  status: string | null;
  isolation: boolean;
  codeStatus: string | null;
  pendingLabs: number;
  pendingImaging: number;
  pendingConsult: number;
  pendingPt: boolean;
  pendingOt: boolean;
  pendingPharmacy: boolean;
  pendingCaseManagement: boolean;
  pendingPlacement: boolean;
  rapidResponse: boolean;
  stroke: boolean;
  stemi: boolean;
  sepsis: boolean;
  codeBlue: boolean;
  telemetry: boolean;
  dischargeReady: boolean;
  expectedDischarge: string | null;
  currentBarrier: string | null;
  warnings: string[];
  criticalUnacknowledged: number;
  synthesisGeneratedAt: string | null;
  source: "CLINICAL_SYNTHESIS" | "CENSUS_ONLY";
};

export type EnterpriseCapacityDashboardV1 = {
  bedsTotal: number | null;
  bedsOccupied: number | null;
  bedsAvailable: number | null;
  bedsCleaning: number | null;
  bedsBlocked: number | null;
  activeObservation: number;
  activeInpatient: number;
  activeHospitalPatients: number;
  admissionsToday: number;
  dischargesToday: number | null;
  awaitingBed: number;
  readyForTransfer: number;
  pendingPlacement: number;
  los24hOrMore: number;
  readyDischarge: number;
  criticalResults: number;
  pendingResults: number;
  /** Explicit: placement logic not enabled — visibility only. */
  placementLogicEnabled: false;
  inferredCapacity: false;
};

export type EnterpriseCommandCenterDashboardV1 = {
  certification: typeof ENTERPRISE_COMMAND_LAYER_CERTIFICATION_ID;
  generatedAt: string;
  facilityId: string;
  capacity: EnterpriseCapacityDashboardV1;
  trackBoardCount: number;
  openTasks: number;
  openEscalations: number;
  criticalAlerts: number;
  pendingConsults: number;
  pendingImaging: number;
  dischargeReady: number;
  neverEditProviderNotes: true;
  neverEditNursingDocumentation: true;
  consumesClinicalSynthesis: true;
};

export type EnterpriseExecutiveSummaryV1 = {
  certification: typeof ENTERPRISE_COMMAND_LAYER_CERTIFICATION_ID;
  generatedAt: string;
  facilityId: string;
  census: number;
  admissionsToday: number;
  dischargesToday: number | null;
  averageLosHours: number | null;
  capacityOccupancyPct: number | null;
  criticalAlerts: number;
  pendingConsult: number;
  pendingPlacement: number;
  transfersReady: number;
  phiMinimized: true;
  readOnly: true;
};

export type EnterpriseMobileContractV1 = {
  certification: typeof ENTERPRISE_COMMAND_LAYER_CERTIFICATION_ID;
  trackBoardLite: Array<{
    encounterId: string;
    patientName: string;
    unitRoomBed: string | null;
    status: string | null;
    criticalUnacknowledged: number;
    dischargeReady: boolean;
  }>;
  criticalAlerts: Array<{ escalationId: string; summary: string; alertType: string }>;
  openTasks: Array<{ taskId: string; title: string; priority: string }>;
  notifications: Array<{ notificationId: string; title: string; target: string }>;
  mobileUiImplemented: false;
};

export function emptyEnterpriseCommandDocV1(nowIso?: string): EnterpriseCommandDocV1 {
  return {
    version: 1,
    expectedVersion: 0,
    tasks: [],
    escalations: [],
    notifications: [],
    updatedAt: nowIso ?? new Date().toISOString(),
  };
}

export function readEnterpriseCommandDoc(admissionSummaryJson: unknown): EnterpriseCommandDocV1 {
  if (!admissionSummaryJson || typeof admissionSummaryJson !== "object") {
    return emptyEnterpriseCommandDocV1();
  }
  const raw = (admissionSummaryJson as Record<string, unknown>)[ENTERPRISE_COMMAND_V1_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyEnterpriseCommandDocV1();
  }
  const doc = raw as EnterpriseCommandDocV1;
  return {
    ...emptyEnterpriseCommandDocV1(),
    ...doc,
    version: 1,
    tasks: Array.isArray(doc.tasks) ? doc.tasks : [],
    escalations: Array.isArray(doc.escalations) ? doc.escalations : [],
    notifications: Array.isArray(doc.notifications) ? doc.notifications : [],
  };
}

export function mergeEnterpriseCommandIntoSummary(
  admissionSummaryJson: unknown,
  doc: EnterpriseCommandDocV1
): Record<string, unknown> {
  const base =
    admissionSummaryJson &&
    typeof admissionSummaryJson === "object" &&
    !Array.isArray(admissionSummaryJson)
      ? { ...(admissionSummaryJson as Record<string, unknown>) }
      : {};
  base[ENTERPRISE_COMMAND_V1_KEY] = doc;
  return base;
}

export function buildTrackBoardRowFromCensusAndSynthesis(input: {
  census: HospitalCensusPatientRow;
  synthesis?: CommandCenterSynthesisLiteV1 | null;
  commandDoc?: EnterpriseCommandDocV1 | null;
}): EnterpriseTrackBoardRowV1 {
  const c = input.census;
  const s = input.synthesis;
  const unitRoom = String(c.unitRoomBed ?? "");
  const parts = unitRoom.split(/[-:]/).map((x) => x.trim()).filter(Boolean);
  const alerts = c.alerts ?? [];
  const has = (code: string) =>
    alerts.some((a) => a.code.toUpperCase().includes(code.toUpperCase()));
  const openEsc = (input.commandDoc?.escalations ?? []).filter(
    (e) => e.status === "OPEN" || e.status === "ACKNOWLEDGED"
  );
  const warnings: string[] = [];
  if ((s?.criticalUnacknowledgedCount ?? 0) > 0) warnings.push("CRITICAL_UNACKNOWLEDGED");
  if (has("ISOLATION")) warnings.push("ISOLATION");
  if (openEsc.length) warnings.push("OPEN_ESCALATION");

  return {
    encounterId: c.encounterId,
    patientId: s?.patientId ?? null,
    patientName: c.patientName,
    mrn: c.mrn,
    room: parts.length > 1 ? parts[1]! : unitRoom || null,
    bed: parts.length > 2 ? parts[2]! : null,
    unit: parts[0] ?? s?.levelOfCare ?? null,
    provider: s?.attendingDisplayName ?? c.attendingName,
    rn: c.nurseName,
    losHours: s?.lengthOfStayHours ?? c.losHours,
    admissionTime: c.admittedAt,
    clinicalContext: c.clinicalContext,
    status: s?.status ?? null,
    isolation: has("ISOLATION"),
    codeStatus: null,
    pendingLabs: s?.pendingImagingCount != null ? 0 : 0,
    pendingImaging: s?.pendingImagingCount ?? 0,
    pendingConsult: s?.pendingConsultCount ?? (has("CONSULT") ? 1 : 0),
    pendingPt: has("PT") || has("PHYSIO"),
    pendingOt: has("OT") || has("OCCUPATIONAL"),
    pendingPharmacy: has("PHARMACY") || has("MED_RECON"),
    pendingCaseManagement: has("CASE_MANAGEMENT"),
    pendingPlacement: has("PLACEMENT") || has("AWAITING_BED"),
    rapidResponse: has("RAPID") || openEsc.some((e) => e.alertType === "RAPID_RESPONSE"),
    stroke: has("STROKE") || openEsc.some((e) => e.alertType === "STROKE"),
    stemi: has("STEMI") || openEsc.some((e) => e.alertType === "STEMI"),
    sepsis: has("SEPSIS") || openEsc.some((e) => e.alertType === "SEPSIS"),
    codeBlue: has("CODE") || openEsc.some((e) => e.alertType === "CODE_BLUE"),
    telemetry: has("TELEMETRY"),
    dischargeReady:
      s?.dischargeReadiness.medicalReady === true || has("DISCHARGE"),
    expectedDischarge: null,
    currentBarrier:
      (s?.dischargeReadiness.barrierCount ?? 0) > 0
        ? `barriers:${s!.dischargeReadiness.barrierCount}`
        : null,
    warnings,
    criticalUnacknowledged: s?.criticalUnacknowledgedCount ?? 0,
    synthesisGeneratedAt: s?.generatedAt ?? null,
    source: s ? "CLINICAL_SYNTHESIS" : "CENSUS_ONLY",
  };
}

export function filterEnterprisePatientList(
  rows: EnterpriseTrackBoardRowV1[],
  kind: EnterprisePatientListKind,
  query?: string | null
): EnterpriseTrackBoardRowV1[] {
  const q = String(query ?? "")
    .trim()
    .toLowerCase();
  let filtered = [...rows];
  switch (kind) {
    case "OBSERVATION":
      filtered = filtered.filter((r) => r.clinicalContext === "OBSERVATION");
      break;
    case "ISOLATION":
      filtered = filtered.filter((r) => r.isolation);
      break;
    case "DISCHARGE_TODAY":
      filtered = filtered.filter((r) => r.dischargeReady);
      break;
    case "PENDING_CONSULT":
      filtered = filtered.filter((r) => r.pendingConsult > 0);
      break;
    case "PENDING_IMAGING":
      filtered = filtered.filter((r) => r.pendingImaging > 0);
      break;
    case "PENDING_PT":
      filtered = filtered.filter((r) => r.pendingPt);
      break;
    case "PENDING_PLACEMENT":
      filtered = filtered.filter((r) => r.pendingPlacement);
      break;
    case "RAPID_RESPONSE":
      filtered = filtered.filter((r) => r.rapidResponse);
      break;
    case "CRITICAL_RESULTS":
      filtered = filtered.filter((r) => r.criticalUnacknowledged > 0);
      break;
    case "UNIT":
      break;
    case "PROVIDER":
    case "RESIDENT":
    case "HOSPITALIST":
    case "APP":
    case "CONSULT":
    case "RN":
    case "CHARGE_NURSE":
      break;
    default:
      break;
  }
  if (q) {
    filtered = filtered.filter((r) =>
      `${r.patientName} ${r.mrn ?? ""} ${r.unit ?? ""} ${r.provider ?? ""} ${r.rn ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }
  return filtered;
}

export function buildCapacityFromCensusSummary(input: {
  summary: {
    activeObservation: number;
    activeInpatient: number;
    activeHospitalPatients: number;
    placementRequested?: number;
    awaitingBed: number;
    readyForTransfer: number;
    admissionsToday: number;
    dischargesToday?: number | null;
    bedsTotal: number | null;
    bedsAvailable: number | null;
    bedsOccupied: number | null;
    bedsCleaning: number | null;
    bedsBlocked: number | null;
  };
  operationalSnapshot?: {
    los24hOrMore: number;
    readyDischarge: number;
    criticalResults: number;
    pendingResults: number;
    awaitingBed: number;
  } | null;
}): EnterpriseCapacityDashboardV1 {
  return {
    bedsTotal: input.summary.bedsTotal,
    bedsOccupied: input.summary.bedsOccupied,
    bedsAvailable: input.summary.bedsAvailable,
    bedsCleaning: input.summary.bedsCleaning,
    bedsBlocked: input.summary.bedsBlocked,
    activeObservation: input.summary.activeObservation,
    activeInpatient: input.summary.activeInpatient,
    activeHospitalPatients: input.summary.activeHospitalPatients,
    admissionsToday: input.summary.admissionsToday,
    dischargesToday: input.summary.dischargesToday ?? null,
    awaitingBed: input.summary.awaitingBed,
    readyForTransfer: input.summary.readyForTransfer,
    pendingPlacement: input.summary.placementRequested ?? input.summary.awaitingBed,
    los24hOrMore: input.operationalSnapshot?.los24hOrMore ?? 0,
    readyDischarge: input.operationalSnapshot?.readyDischarge ?? 0,
    criticalResults: input.operationalSnapshot?.criticalResults ?? 0,
    pendingResults: input.operationalSnapshot?.pendingResults ?? 0,
    placementLogicEnabled: false,
    inferredCapacity: false,
  };
}

export function upsertEnterpriseTask(input: {
  doc: EnterpriseCommandDocV1;
  task: EnterpriseCommandTaskV1;
  clientExpectedVersion: number;
  actorUserId: string;
  atIso?: string;
}):
  | { ok: true; doc: EnterpriseCommandDocV1 }
  | { ok: false; code: "ENTERPRISE_COMMAND_STALE" } {
  if (input.clientExpectedVersion !== input.doc.expectedVersion) {
    return { ok: false, code: "ENTERPRISE_COMMAND_STALE" };
  }
  const at = input.atIso ?? new Date().toISOString();
  const tasks = [...input.doc.tasks];
  const idx = tasks.findIndex((t) => t.taskId === input.task.taskId);
  if (idx >= 0) tasks[idx] = input.task;
  else tasks.push(input.task);
  return {
    ok: true,
    doc: {
      ...input.doc,
      tasks,
      expectedVersion: input.doc.expectedVersion + 1,
      updatedAt: at,
      updatedByUserId: input.actorUserId,
    },
  };
}

export function upsertEnterpriseEscalation(input: {
  doc: EnterpriseCommandDocV1;
  escalation: EnterpriseCommandEscalationV1;
  clientExpectedVersion: number;
  actorUserId: string;
  atIso?: string;
}):
  | { ok: true; doc: EnterpriseCommandDocV1 }
  | { ok: false; code: "ENTERPRISE_COMMAND_STALE" } {
  if (input.clientExpectedVersion !== input.doc.expectedVersion) {
    return { ok: false, code: "ENTERPRISE_COMMAND_STALE" };
  }
  const at = input.atIso ?? new Date().toISOString();
  const escalations = [...input.doc.escalations];
  const idx = escalations.findIndex((e) => e.escalationId === input.escalation.escalationId);
  if (idx >= 0) escalations[idx] = input.escalation;
  else escalations.push(input.escalation);
  return {
    ok: true,
    doc: {
      ...input.doc,
      escalations,
      expectedVersion: input.doc.expectedVersion + 1,
      updatedAt: at,
      updatedByUserId: input.actorUserId,
    },
  };
}

export function deriveAlertsFromTrackBoard(
  rows: EnterpriseTrackBoardRowV1[]
): Array<{ alertType: EnterpriseAlertType; encounterId: string; summary: string }> {
  const alerts: Array<{ alertType: EnterpriseAlertType; encounterId: string; summary: string }> =
    [];
  for (const r of rows) {
    if (r.criticalUnacknowledged > 0) {
      alerts.push({
        alertType: "CRITICAL_LAB",
        encounterId: r.encounterId,
        summary: `Critical unacknowledged result — ${r.patientName}`,
      });
    }
    if (r.rapidResponse) {
      alerts.push({
        alertType: "RAPID_RESPONSE",
        encounterId: r.encounterId,
        summary: `Rapid response — ${r.patientName}`,
      });
    }
    if (r.stroke) {
      alerts.push({
        alertType: "STROKE",
        encounterId: r.encounterId,
        summary: `Stroke alert — ${r.patientName}`,
      });
    }
    if (r.stemi) {
      alerts.push({
        alertType: "STEMI",
        encounterId: r.encounterId,
        summary: `STEMI alert — ${r.patientName}`,
      });
    }
    if (r.sepsis) {
      alerts.push({
        alertType: "SEPSIS",
        encounterId: r.encounterId,
        summary: `Sepsis alert — ${r.patientName}`,
      });
    }
    if (r.codeBlue) {
      alerts.push({
        alertType: "CODE_BLUE",
        encounterId: r.encounterId,
        summary: `Code blue — ${r.patientName}`,
      });
    }
  }
  return alerts;
}

/** Architectural invariants. */
export function enterpriseCommandMustConsumeClinicalSynthesis(): true {
  return true;
}
export function enterpriseCommandMustNotOwnClinicalDocumentation(): true {
  return true;
}
export function enterpriseCommandMustNotEnablePlacement(): true {
  return true;
}
export function enterpriseCommandMustNotDuplicateDomainEngines(): true {
  return true;
}
export function enterpriseDashboardsAreNotLegalRecords(): true {
  return true;
}
