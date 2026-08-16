/**
 * MEDUI.D4C.10D — Enterprise active visit routing, worklist ownership & deduplication.
 *
 * Concurrency (D4C.10) ≠ worklist projection.
 * Encounter.serviceLine is the authoritative current operational destination for
 * ambulatory boards — no second routing table / migration.
 *
 * In-place Clinic→Dental routing is allowed ONLY for SAFE UNCLAIMED WAIT visits
 * (no clinical/financial ownership). Ownership forces CREATE_NEW_DENTAL.
 */

import { normalizePersistedEncounterServiceLine } from "../encounters/enterpriseEncounterServiceLineProvenanceD4c10a.js";
import { nursingAssessmentHasDentalClinicalEvaluationContent } from "../auth/enterpriseDentalClinicalEvaluationD5a4a.js";
import { isDentalEncounterProjection } from "../auth/enterpriseDentalEncounterWorkspaceD5a3.js";
import { PROVIDER_DOCUMENTATION_NAMESPACE_KEY } from "../encounters/documentationCompletenessFlags.js";

export const D4C10D_CERTIFICATION_ID = "MEDUI.D4C.10D" as const;

/** Clinic / general ambulatory waiting & operational boards. */
export const D4C10D_CLINIC_AMBULATORY_WORKLIST_SERVICE_LINES = [
  "CLINIC",
  "URGENT_CARE",
] as const;

/** Dental operational worklist. */
export const D4C10D_DENTAL_WORKLIST_SERVICE_LINES = ["DENTAL"] as const;

/** Workflow states still compatible with registration/waiting (no clinical ownership yet). */
export const D4C10D_WAITING_WORKFLOW_STATES = ["ARRIVED"] as const;

export type D4c10dOpenEncounterRoutingSnapshot = {
  id: string;
  type?: string | null;
  status?: string | null;
  serviceLine?: string | null;
  providerDocumentationStatus?: string | null;
  providerDocumentationSignedAt?: string | Date | null;
  providerDocumentationSignedByUserId?: string | null;
  providerNote?: string | null;
  treatmentPlan?: string | null;
  /** DTO alias — maps to providerNote on Encounter; kept for callers. */
  clinicianImpression?: string | null;
  notes?: string | null;
  nursingAssessment?: unknown;
  admissionSummaryJson?: unknown;
  dischargeSummaryJson?: unknown;
  /** Provider / attending assignment */
  physicianAssignedUserId?: string | null;
  /** RN operational assignment */
  nurseAssignedUserId?: string | null;
  /** Legacy provider column */
  providerId?: string | null;
  roomLabel?: string | null;
  disposition?: string | null;
  dischargeStatus?: string | null;
  dischargedAt?: string | Date | null;
  admittedAt?: string | Date | null;
  closedAt?: string | Date | null;
  reopenCount?: number | null;
  workflowState?: string | null;
  billingFinalizationStatus?: string | null;
  billingFinalizedAt?: string | Date | null;
  billingCaptureJson?: unknown;
  hospitalEpisodeId?: string | null;
  triageAcuity?: number | null;
  /** Related ownership counts (loaded by API). */
  diagnosisCount?: number | null;
  orderCount?: number | null;
  encounterNoteCount?: number | null;
  billingEventCount?: number | null;
  claimSubmissionCount?: number | null;
  clinicalEventCount?: number | null;
  clinicalDocumentationEntryCount?: number | null;
  medicationAdministrationCount?: number | null;
  toothFindingCount?: number | null;
  providerAddendumCount?: number | null;
  lifecycleTransitionCount?: number | null;
  triageCompleteAt?: string | Date | null;
  /** Structured vitals on the encounter row (clinical ownership if non-empty). */
  vitals?: unknown;
  /** Appointment present is not ownership; explicit clinic-locked destination is. */
  appointmentRequiresClinicOnly?: boolean | null;
};

/**
 * Clinic ambulatory worklist membership by durable serviceLine.
 * Legacy null OUTPATIENT remains on Clinic board (unknown ≠ Dental).
 */
export function isClinicAmbulatoryWorklistServiceLine(
  serviceLine: string | null | undefined
): boolean {
  const line = normalizePersistedEncounterServiceLine(serviceLine);
  if (line == null) return true;
  return (D4C10D_CLINIC_AMBULATORY_WORKLIST_SERVICE_LINES as readonly string[]).includes(
    line
  );
}

/** Dental worklist membership — durable DENTAL first, then legacy JSON projection. */
export function isDentalWorklistEncounter(
  row: D4c10dOpenEncounterRoutingSnapshot
): boolean {
  const line = normalizePersistedEncounterServiceLine(row.serviceLine);
  if (line != null && String(line) === "DENTAL") return true;
  if (line != null) return false;
  return isDentalEncounterProjection({
    type: row.type,
    serviceLine: row.serviceLine,
    nursingAssessment: row.nursingAssessment,
    admissionSummaryJson: row.admissionSummaryJson,
  });
}

/** Prisma-friendly OR for Clinic Care OPEN ambulatory queues. */
export function clinicAmbulatoryWorklistServiceLineWhere(): {
  OR: Array<Record<string, unknown>>;
} {
  return {
    OR: [
      { serviceLine: null },
      { serviceLine: { in: [...D4C10D_CLINIC_AMBULATORY_WORKLIST_SERVICE_LINES] } },
    ],
  };
}

/** Prisma-friendly OR for Dental OPEN worklist SQL prefilter. */
export function dentalWorklistServiceLineWhere(): {
  OR: Array<Record<string, unknown>>;
} {
  return {
    OR: [
      { serviceLine: { in: [...D4C10D_DENTAL_WORKLIST_SERVICE_LINES] } },
      { serviceLine: null },
    ],
  };
}

export function dedupeWorklistRowsByEncounterId<T extends { id: string }>(
  rows: readonly T[]
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const id = String(row.id ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}

function asObject(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function namespaceHasContent(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) {
    return value.some((item) => namespaceHasContent(item));
  }
  const obj = asObject(value);
  if (!obj) return false;
  return Object.values(obj).some((v) => namespaceHasContent(v));
}

function hasPhysicianEvalV1Content(nursingAssessment: unknown): boolean {
  const pe = asObject(asObject(nursingAssessment)?.physicianEvalV1);
  if (!pe) return false;
  for (const k of ["hpi", "ros", "physicalExam", "mdm"]) {
    const v = pe[k];
    if (typeof v === "string" && v.trim().length > 0) return true;
  }
  return false;
}

function hasNursingEvalV1Content(nursingAssessment: unknown): boolean {
  return namespaceHasContent(asObject(nursingAssessment)?.nursingEvalV1);
}

function hasProviderMseContent(nursingAssessment: unknown): boolean {
  return namespaceHasContent(asObject(nursingAssessment)?.[PROVIDER_DOCUMENTATION_NAMESPACE_KEY]);
}

/** Waiting-room / destination-hint labels are not clinical ownership. */
export function isRegistrationCompatibleRoomLabel(roomLabel: string | null | undefined): boolean {
  const raw = String(roomLabel ?? "").trim();
  if (!raw) return true;
  const lower = raw.toLowerCase();
  if (lower === "dental") return true;
  if (lower.includes("attente") || lower.includes("waiting")) return true;
  if (lower === "salle d'attente" || lower === "salle d’attente") return true;
  // Numeric exam rooms (1–30) and other clinical labels ⇒ ownership.
  if (/^\d{1,2}$/.test(raw)) return false;
  return false;
}

export type D4c10dOwnershipBlockerCode =
  | "NOT_OPEN"
  | "WRONG_TYPE"
  | "WRONG_SERVICE_LINE"
  | "PROVIDER_ASSIGNED"
  | "NURSE_ASSIGNED"
  | "LEGACY_PROVIDER_SET"
  | "DOCUMENTATION_SIGNED"
  | "PROVIDER_NOTE"
  | "TREATMENT_PLAN"
  | "ENCOUNTER_NOTES_FIELD"
  | "PHYSICIAN_EVAL"
  | "PROVIDER_MSE"
  | "NURSING_EVAL"
  | "DENTAL_EVAL"
  | "DENTAL_TAGGED"
  | "DIAGNOSIS"
  | "ORDER"
  | "ENCOUNTER_NOTE"
  | "BILLING_EVENT"
  | "BILLING_CAPTURE"
  | "BILLING_FINALIZED"
  | "CLAIM_SUBMISSION"
  | "DISPOSITION"
  | "DISCHARGE"
  | "ADMISSION"
  | "CLOSED_MARKER"
  | "REOPENED"
  | "WORKFLOW_BEYOND_ARRIVED"
  | "TRIAGE_COMPLETED"
  | "CLINICAL_EVENT"
  | "CLINICAL_DOCUMENTATION"
  | "MEDICATION_ADMIN"
  | "TOOTH_FINDING"
  | "PROVIDER_ADDENDUM"
  | "LIFECYCLE_TRANSITION"
  | "HOSPITAL_EPISODE"
  | "CLINICAL_ROOM"
  | "VITALS"
  | "APPOINTMENT_CLINIC_LOCKED";

/**
 * Authoritative ownership blockers. Empty ⇒ SAFE UNCLAIMED WAIT (eligible for in-place route).
 */
export function listClinicOwnershipBlockersForDentalReroute(
  row: D4c10dOpenEncounterRoutingSnapshot
): D4c10dOwnershipBlockerCode[] {
  const blockers: D4c10dOwnershipBlockerCode[] = [];

  if (String(row.status ?? "").toUpperCase() !== "OPEN") blockers.push("NOT_OPEN");

  const type = String(row.type ?? "").toUpperCase();
  if (type !== "OUTPATIENT" && type !== "URGENT_CARE") blockers.push("WRONG_TYPE");

  const line = normalizePersistedEncounterServiceLine(row.serviceLine);
  if (line != null && (String(line) === "DENTAL" || String(line) === "EMERGENCY")) {
    blockers.push("WRONG_SERVICE_LINE");
  } else if (
    line != null &&
    String(line) !== "CLINIC" &&
    String(line) !== "URGENT_CARE"
  ) {
    blockers.push("WRONG_SERVICE_LINE");
  }

  if (String(row.physicianAssignedUserId ?? "").trim()) blockers.push("PROVIDER_ASSIGNED");
  if (String(row.nurseAssignedUserId ?? "").trim()) blockers.push("NURSE_ASSIGNED");
  if (String(row.providerId ?? "").trim()) blockers.push("LEGACY_PROVIDER_SET");

  if (String(row.providerDocumentationStatus ?? "").toUpperCase() === "SIGNED") {
    blockers.push("DOCUMENTATION_SIGNED");
  }
  if (row.providerDocumentationSignedAt) blockers.push("DOCUMENTATION_SIGNED");
  if (String(row.providerDocumentationSignedByUserId ?? "").trim()) {
    blockers.push("DOCUMENTATION_SIGNED");
  }

  if (String(row.providerNote ?? "").trim() || String(row.clinicianImpression ?? "").trim()) {
    blockers.push("PROVIDER_NOTE");
  }
  if (String(row.treatmentPlan ?? "").trim()) blockers.push("TREATMENT_PLAN");
  if (String(row.notes ?? "").trim()) blockers.push("ENCOUNTER_NOTES_FIELD");

  if (hasPhysicianEvalV1Content(row.nursingAssessment)) blockers.push("PHYSICIAN_EVAL");
  if (hasProviderMseContent(row.nursingAssessment)) blockers.push("PROVIDER_MSE");
  if (hasNursingEvalV1Content(row.nursingAssessment)) blockers.push("NURSING_EVAL");
  if (nursingAssessmentHasDentalClinicalEvaluationContent(row.nursingAssessment)) {
    blockers.push("DENTAL_EVAL");
  }
  if (
    isDentalEncounterProjection({
      type: row.type,
      serviceLine: row.serviceLine,
      nursingAssessment: row.nursingAssessment,
      admissionSummaryJson: row.admissionSummaryJson,
    })
  ) {
    blockers.push("DENTAL_TAGGED");
  }

  if ((row.diagnosisCount ?? 0) > 0) blockers.push("DIAGNOSIS");
  if ((row.orderCount ?? 0) > 0) blockers.push("ORDER");
  if ((row.encounterNoteCount ?? 0) > 0) blockers.push("ENCOUNTER_NOTE");
  if ((row.billingEventCount ?? 0) > 0) blockers.push("BILLING_EVENT");
  if (namespaceHasContent(row.billingCaptureJson)) blockers.push("BILLING_CAPTURE");

  const billStatus = String(row.billingFinalizationStatus ?? "NOT_READY").toUpperCase();
  if (billStatus && billStatus !== "NOT_READY") blockers.push("BILLING_FINALIZED");
  if (row.billingFinalizedAt) blockers.push("BILLING_FINALIZED");
  if ((row.claimSubmissionCount ?? 0) > 0) blockers.push("CLAIM_SUBMISSION");

  if (String(row.disposition ?? "").trim()) blockers.push("DISPOSITION");
  if (String(row.dischargeStatus ?? "").trim() || row.dischargedAt) blockers.push("DISCHARGE");
  if (namespaceHasContent(row.dischargeSummaryJson)) blockers.push("DISCHARGE");
  if (row.admittedAt) blockers.push("ADMISSION");
  if (row.closedAt) blockers.push("CLOSED_MARKER");
  if ((row.reopenCount ?? 0) > 0) blockers.push("REOPENED");

  const wf = String(row.workflowState ?? "ARRIVED").toUpperCase();
  if (wf && !(D4C10D_WAITING_WORKFLOW_STATES as readonly string[]).includes(wf)) {
    blockers.push("WORKFLOW_BEYOND_ARRIVED");
  }

  if (row.triageCompleteAt || row.triageAcuity != null) blockers.push("TRIAGE_COMPLETED");

  if ((row.clinicalEventCount ?? 0) > 0) blockers.push("CLINICAL_EVENT");
  if ((row.clinicalDocumentationEntryCount ?? 0) > 0) blockers.push("CLINICAL_DOCUMENTATION");
  if ((row.medicationAdministrationCount ?? 0) > 0) blockers.push("MEDICATION_ADMIN");
  if ((row.toothFindingCount ?? 0) > 0) blockers.push("TOOTH_FINDING");
  if ((row.providerAddendumCount ?? 0) > 0) blockers.push("PROVIDER_ADDENDUM");
  if ((row.lifecycleTransitionCount ?? 0) > 0) blockers.push("LIFECYCLE_TRANSITION");
  if (String(row.hospitalEpisodeId ?? "").trim()) blockers.push("HOSPITAL_EPISODE");

  if (!isRegistrationCompatibleRoomLabel(row.roomLabel)) blockers.push("CLINICAL_ROOM");
  if (namespaceHasContent(row.vitals)) blockers.push("VITALS");
  if (row.appointmentRequiresClinicOnly === true) blockers.push("APPOINTMENT_CLINIC_LOCKED");

  return [...new Set(blockers)];
}

/**
 * True when the Clinic/legacy ambulatory OPEN row is a SAFE UNCLAIMED WAIT
 * (no clinical or financial ownership) — eligible for in-place Dental routing.
 */
export function isUnclaimedAmbulatoryWaitingVisit(
  row: D4c10dOpenEncounterRoutingSnapshot
): boolean {
  return listClinicOwnershipBlockersForDentalReroute(row).length === 0;
}

export type D4c10dDentalVisitStartPlan =
  | { action: "REUSE_EXISTING_DENTAL"; encounterId: string }
  | { action: "ROUTE_UNCLAIMED_CLINIC"; encounterId: string; previousServiceLine: string | null }
  | {
      action: "CREATE_NEW_DENTAL";
      reason: "NO_ROUTABLE_VISIT" | "CLINIC_DOCUMENTED";
      blockingEncounterId?: string;
      ownershipBlockers?: D4c10dOwnershipBlockerCode[];
    };

/**
 * Decide how Dental start should behave for a patient with current OPEN rows.
 * Never converts a clinically/financially owned Clinic encounter into Dental.
 */
export function planDentalVisitStart(
  openEncounters: readonly D4c10dOpenEncounterRoutingSnapshot[]
): D4c10dDentalVisitStartPlan {
  const open = openEncounters.filter((e) => String(e.status ?? "").toUpperCase() === "OPEN");

  const existingDental = open.find((e) => isDentalWorklistEncounter(e));
  if (existingDental) {
    return { action: "REUSE_EXISTING_DENTAL", encounterId: existingDental.id };
  }

  const unclaimed = open.find((e) => isUnclaimedAmbulatoryWaitingVisit(e));
  if (unclaimed) {
    return {
      action: "ROUTE_UNCLAIMED_CLINIC",
      encounterId: unclaimed.id,
      previousServiceLine: normalizePersistedEncounterServiceLine(unclaimed.serviceLine),
    };
  }

  const ownedClinic = open.find((e) => {
    const line = normalizePersistedEncounterServiceLine(e.serviceLine);
    const type = String(e.type ?? "").toUpperCase();
    if (type !== "OUTPATIENT" && type !== "URGENT_CARE") return false;
    if (line != null && String(line) === "DENTAL") return false;
    return !isUnclaimedAmbulatoryWaitingVisit(e);
  });

  if (ownedClinic) {
    return {
      action: "CREATE_NEW_DENTAL",
      reason: "CLINIC_DOCUMENTED",
      blockingEncounterId: ownedClinic.id,
      ownershipBlockers: listClinicOwnershipBlockersForDentalReroute(ownedClinic),
    };
  }

  return { action: "CREATE_NEW_DENTAL", reason: "NO_ROUTABLE_VISIT" };
}
