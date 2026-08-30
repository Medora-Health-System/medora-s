/**
 * D3E.7 — Durable Inpatient clinical operations state (JSON on Encounter.admissionSummaryJson).
 * Zero schema migration: nested under inpatientClinicalOpsV1.
 */

export const INPATIENT_CODE_STATUSES = [
  "FULL_CODE",
  "DNR",
  "DNI",
  "DNR_DNI",
  "COMFORT_MEASURES_ONLY",
  "LIMITED_INTERVENTIONS",
  "UNKNOWN",
  "PENDING_DISCUSSION",
] as const;

export type InpatientCodeStatus = (typeof INPATIENT_CODE_STATUSES)[number];

export const INPATIENT_ISOLATION_PRECAUTIONS = [
  "STANDARD",
  "CONTACT",
  "DROPLET",
  "AIRBORNE",
  "ENTERIC",
  "PROTECTIVE",
  "ENHANCED_RESPIRATORY",
  /** D4A.3.3A — first-class hospital isolation types (no enum folding). */
  "ENHANCED_CONTACT",
  "COVID",
] as const;

export type InpatientIsolationPrecaution = (typeof INPATIENT_ISOLATION_PRECAUTIONS)[number];

export const INPATIENT_DISCHARGE_WORKFLOW_STATES = [
  "PLANNING",
  "READY",
  "ORDERED",
  "INSTRUCTIONS_COMPLETE",
  "DEPARTED",
  "COMPLETED",
] as const;

export type InpatientDischargeWorkflowState =
  (typeof INPATIENT_DISCHARGE_WORKFLOW_STATES)[number];

export const MED_RECON_DECISIONS = [
  "CONTINUE",
  "MODIFY",
  "HOLD",
  "DISCONTINUE",
  "REPLACE",
  "NOT_TAKING",
  "UNABLE_TO_VERIFY",
] as const;

export type MedReconDecision = (typeof MED_RECON_DECISIONS)[number];

export type InpatientClinicalOpsV1 = {
  version: 1;
  codeStatus?: {
    status: InpatientCodeStatus;
    effectiveAt: string;
    documentedByUserId: string;
    comments?: string | null;
  } | null;
  isolation?: {
    precautions: InpatientIsolationPrecaution[];
    reason?: string | null;
    startedAt: string;
    orderedByUserId: string;
  } | null;
  carePlan?: Array<{
    itemId: string;
    discipline: string;
    goalText: string;
    status: "ACTIVE" | "MET" | "DISCONTINUED";
    updatedAt: string;
  }>;
  dischargePlanning?: {
    anticipatedDischargeDate?: string | null;
    destination?: string | null;
    workflowState: InpatientDischargeWorkflowState;
    transportation?: string | null;
    barriers?: string | null;
    /** INP.DIS.1F — planning card extras (JSON only). */
    homeHealth?: string | null;
    specialNeedsEquipment?: string | null;
    careTeamNotified?: boolean | null;
    updatedAt: string;
  } | null;
  medicationReconciliation?: Array<{
    lineId: string;
    sourceLabel: string;
    decision: MedReconDecision;
    reason?: string | null;
    actorUserId: string;
    decidedAt: string;
    resultingOrderId?: string | null;
  }>;
  consults?: Array<{
    consultId: string;
    specialty: string;
    reason: string;
    priority: "ROUTINE" | "URGENT" | "STAT";
    status: "REQUESTED" | "ACKNOWLEDGED" | "IN_PROGRESS" | "COMPLETED" | "DECLINED" | "CANCELLED";
    requestedAt: string;
    requestedByUserId: string;
    completedAt?: string | null;
  }>;
  nursing?: {
    admissionAssessmentComplete?: boolean;
    lastShiftAssessmentAt?: string | null;
  };
  /** Append-only assignment history; current attending/nurse remain on Encounter columns. */
  careTeamHistory?: Array<{
    assignmentId: string;
    role: string;
    assigneeUserId: string;
    startAt: string;
    endAt: string | null;
    assignedByUserId: string;
    facilityId: string;
    encounterId: string;
  }>;
};

export const INPATIENT_CLINICAL_OPS_KEY = "inpatientClinicalOpsV1" as const;

export function emptyInpatientClinicalOpsV1(): InpatientClinicalOpsV1 {
  return {
    version: 1,
    codeStatus: null,
    isolation: null,
    carePlan: [],
    dischargePlanning: {
      workflowState: "PLANNING",
      updatedAt: new Date(0).toISOString(),
    },
    medicationReconciliation: [],
    consults: [],
    nursing: {},
  };
}

export function readInpatientClinicalOpsFromAdmissionSummary(
  admissionSummaryJson: unknown
): InpatientClinicalOpsV1 {
  if (!admissionSummaryJson || typeof admissionSummaryJson !== "object") {
    return emptyInpatientClinicalOpsV1();
  }
  const o = admissionSummaryJson as Record<string, unknown>;
  const raw = o[INPATIENT_CLINICAL_OPS_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyInpatientClinicalOpsV1();
  }
  const ops = raw as InpatientClinicalOpsV1;
  return {
    ...emptyInpatientClinicalOpsV1(),
    ...ops,
    version: 1,
    carePlan: Array.isArray(ops.carePlan) ? ops.carePlan : [],
    medicationReconciliation: Array.isArray(ops.medicationReconciliation)
      ? ops.medicationReconciliation
      : [],
    consults: Array.isArray(ops.consults) ? ops.consults : [],
  };
}

export function mergeInpatientClinicalOpsIntoAdmissionSummary(
  admissionSummaryJson: unknown,
  ops: InpatientClinicalOpsV1
): Record<string, unknown> {
  const base =
    admissionSummaryJson && typeof admissionSummaryJson === "object" && !Array.isArray(admissionSummaryJson)
      ? { ...(admissionSummaryJson as Record<string, unknown>) }
      : {};
  base[INPATIENT_CLINICAL_OPS_KEY] = { ...ops, version: 1 };
  return base;
}

export function validateMedReconDecision(decision: string): decision is MedReconDecision {
  return (MED_RECON_DECISIONS as readonly string[]).includes(decision);
}

const PLANNING_DESTINATIONS_WITHOUT_TRANSPORT = new Set(["ELOPED", "DECEASED"]);
const PLANNING_DESTINATIONS_REQUIRING_HOME_HEALTH = new Set(["HOME_WITH_HOME_HEALTH"]);

export type InpatientDischargePlanningReadyInput = {
  destination?: string | null;
  transportation?: string | null;
  anticipatedDischargeDate?: string | null;
  homeHealth?: string | null;
  specialNeedsEquipment?: string | null;
  barriers?: string | null;
  careTeamNotified?: boolean | null;
  workflowState?: string | null;
};

/**
 * Operational READY for discharge planning — explicit clinician confirmation, not inferred
 * from non-empty text. Does not replace provider final disposition or 1E close.
 */
export function validateInpatientDischargePlanningReady(
  plan: InpatientDischargePlanningReadyInput
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const dest = typeof plan.destination === "string" ? plan.destination.trim().toUpperCase() : "";
  if (!dest) errors.push("PLANNING_DESTINATION_REQUIRED");
  if (dest && !PLANNING_DESTINATIONS_WITHOUT_TRANSPORT.has(dest)) {
    const transport =
      typeof plan.transportation === "string" ? plan.transportation.trim() : "";
    if (!transport) errors.push("PLANNING_TRANSPORT_REQUIRED");
  }
  if (dest && PLANNING_DESTINATIONS_REQUIRING_HOME_HEALTH.has(dest)) {
    const homeHealth = typeof plan.homeHealth === "string" ? plan.homeHealth.trim() : "";
    if (!homeHealth) errors.push("PLANNING_HOME_HEALTH_REQUIRED");
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function isInpatientDischargePlanningOperationallyReady(input: {
  workflowState?: string | null;
  dirty?: boolean;
}): boolean {
  if (input.dirty) return false;
  const wf = String(input.workflowState ?? "")
    .trim()
    .toUpperCase();
  return wf === "READY" || wf === "COMPLETED";
}

/** Material field edits after READY/COMPLETED return the canonical PLANNING state. */
export function demoteInpatientDischargePlanningWorkflowAfterEdit(
  workflowState: string | null | undefined
): InpatientDischargeWorkflowState {
  const wf = String(workflowState ?? "")
    .trim()
    .toUpperCase();
  if (wf === "READY" || wf === "COMPLETED") return "PLANNING";
  if ((INPATIENT_DISCHARGE_WORKFLOW_STATES as readonly string[]).includes(wf)) {
    return wf as InpatientDischargeWorkflowState;
  }
  return "PLANNING";
}

/** Auto-copy of prior encounter meds into Inpatient is forbidden. */
export function inpatientMedicationAutoCopyForbidden(): true {
  return true;
}

export function signedNoteMustNotBeOverwritten(): true {
  return true;
}

export type PlacementQueueAction =
  | "REVIEW"
  | "ACCEPT"
  | "DECLINE"
  | "REQUEST_CLARIFICATION"
  | "ASSIGN_BED"
  | "MARK_READY"
  | "MARK_DEPARTED"
  | "MARK_ARRIVED"
  | "CANCEL";

export function placementActionToStatus(
  action: PlacementQueueAction
): string | null {
  switch (action) {
    case "REVIEW":
      return "UNDER_REVIEW";
    case "ACCEPT":
      return "ACCEPTED";
    case "DECLINE":
      return "DECLINED";
    case "REQUEST_CLARIFICATION":
      return "UNDER_REVIEW";
    case "ASSIGN_BED":
      return "BED_ASSIGNED";
    case "MARK_READY":
      return "READY_FOR_TRANSFER";
    case "MARK_DEPARTED":
      return "DEPARTED_ED";
    case "MARK_ARRIVED":
      return "ARRIVED_DESTINATION";
    case "CANCEL":
      return "CANCELLED";
    default:
      return null;
  }
}

export function placementActionsForStatus(status: string): PlacementQueueAction[] {
  const s = String(status ?? "")
    .trim()
    .toUpperCase();
  switch (s) {
    case "SIGNED":
    case "REQUESTED":
      return ["REVIEW", "ACCEPT", "DECLINE", "CANCEL"];
    case "UNDER_REVIEW":
      return ["ACCEPT", "DECLINE", "REQUEST_CLARIFICATION", "CANCEL"];
    case "ACCEPTED":
      return ["ASSIGN_BED", "CANCEL"];
    case "BED_ASSIGNED":
      return ["MARK_READY", "ASSIGN_BED", "CANCEL"];
    case "READY_FOR_TRANSFER":
      return ["MARK_DEPARTED", "CANCEL"];
    case "DEPARTED_ED":
      return ["MARK_ARRIVED"];
    default:
      return [];
  }
}

export type DirectAdmissionInput = {
  patientId: string;
  admissionSource:
    | "EMERGENCY_DEPARTMENT"
    | "DIRECT"
    | "CLINIC"
    | "SCHEDULED"
    | "EXTERNAL_TRANSFER"
    | "OBSERVATION_CONVERSION"
    | "OTHER";
  admittingService?: string | null;
  attendingProviderUserId?: string | null;
  admissionDiagnosis?: string | null;
  reasonForAdmission?: string | null;
  requestedLevelOfCare?: string | null;
  requestedUnit?: string | null;
  plannedAt?: string | null;
  isolationRequired?: boolean;
  isolationType?: string | null;
  codeStatus?: InpatientCodeStatus | null;
  notes?: string | null;
};

export function validateDirectAdmissionHardBlockers(input: DirectAdmissionInput): string[] {
  const blockers: string[] = [];
  if (!String(input.patientId ?? "").trim()) blockers.push("PATIENT_REQUIRED");
  if (!String(input.admissionSource ?? "").trim()) blockers.push("ADMISSION_SOURCE_REQUIRED");
  return blockers;
}

export function directAdmissionMustNotCreateEdEncounter(): true {
  return true;
}

export function directAdmissionMustNotCreateObservationEncounter(): true {
  return true;
}

/** H&P body markers for EncounterNote (PROVIDER type). */
export const INPATIENT_NOTE_MARKERS = {
  HISTORY_AND_PHYSICAL: "[INPATIENT_H_AND_P]",
  DAILY_PROGRESS: "[INPATIENT_PROGRESS]",
  NURSING_ADMISSION: "[INPATIENT_NURSING_ADMISSION]",
  NURSING_SHIFT: "[INPATIENT_NURSING_SHIFT]",
  CONSULTANT: "[INPATIENT_CONSULT]",
  DISCHARGE_SUMMARY: "[INPATIENT_DISCHARGE_SUMMARY]",
} as const;

export function inpatientNoteBodyHasMarker(body: string, marker: string): boolean {
  return String(body ?? "").trimStart().startsWith(marker);
}
