/**
 * MEDUI.D4C.8C — Enterprise Patient Medical Record index & navigation contract.
 * Longitudinal patient index only. Encounter legal record remains D4C.8A/8B.
 * Privileged AuditLog remains facility-admin authority (no PatientAuditLog).
 */

import { clinicCareAmbulatoryOpenWorkspacePath } from "./clinicCareAmbulatoryEncounterWorkspaceD4c5b.js";
import {
  enterpriseEncounterRecordPath,
  isEnterpriseEncounterClosed,
  projectEnterpriseEncounterListLifecycle,
  resolveEnterpriseEncounterDisplayMode,
  type EncounterDisplayMode,
} from "./enterpriseClosedEncounterViewerD4c8a.js";
import {
  enterpriseDentalEncounterWorkspacePath,
  isDentalEncounterProjection,
} from "./enterpriseDentalEncounterWorkspaceD5a3.js";
import { resolveReopenWorkspaceTarget } from "./enterpriseEncounterLifecycleAuthorityD4c7k.js";

export const D4C8C_CERTIFICATION_ID = "MEDUI.D4C.8C" as const;

export const ENTERPRISE_PATIENT_MEDICAL_RECORD_TABS = [
  "overview",
  "encounters",
  "clinicalHistory",
  "results",
  "documents",
  "followUp",
] as const;

export type EnterprisePatientMedicalRecordTab =
  (typeof ENTERPRISE_PATIENT_MEDICAL_RECORD_TABS)[number];

export type EnterprisePatientEncounterIndexInput = {
  id: string;
  status?: string | null;
  type?: string | null;
  closedAt?: string | null;
  dischargedAt?: string | null;
  providerDocumentationStatus?: string | null;
  workflowState?: string | null;
  careSetting?: string | null;
  nursingAssessment?: unknown;
  admissionSummaryJson?: unknown;
};

export type EnterprisePatientEncounterIndexProjection = {
  isClosed: boolean;
  showClosedLock: boolean;
  closedAt: string | null;
  displayMode: EncounterDisplayMode;
  /** Canonical navigation from the patient encounter index. */
  href: string;
  careSetting: string;
  /** Board/workspace hub after reopen — informational; not a second lifecycle engine. */
  workspaceHubTarget: string;
};

/**
 * Active-workspace href for OPEN encounters by care setting.
 * CLOSED always uses the enterprise encounter record path (D4C.8A).
 * SIGNED alone never forces closed lock or closed href.
 */
export function resolveEnterprisePatientEncounterIndexHref(
  input: EnterprisePatientEncounterIndexInput,
  options?: { dentalCareEnabled?: boolean }
): string {
  if (isEnterpriseEncounterClosed(input.status)) {
    return enterpriseEncounterRecordPath(input.id);
  }
  const type = String(input.type ?? "").trim().toUpperCase();
  const careHint = String(input.careSetting ?? "").trim().toUpperCase();
  const wf = String(input.workflowState ?? "").trim().toUpperCase();

  const isDental = isDentalEncounterProjection({
    type: input.type,
    careSetting: input.careSetting,
    nursingAssessment: input.nursingAssessment,
    admissionSummaryJson: input.admissionSummaryJson,
  });
  /**
   * MEDUI.D4C.9 — OPERATE vs HISTORICAL READ:
   * OPEN dental workspace only when Dental is currently enabled (operate).
   * When Dental is disabled, OPEN dental still routes to the enterprise record
   * for authorized historical read — never rewrite encounter provenance.
   */
  if (isDental) {
    if (options?.dentalCareEnabled !== false) {
      return enterpriseDentalEncounterWorkspacePath(input.id);
    }
    return enterpriseEncounterRecordPath(input.id);
  }
  if (type === "EMERGENCY" || type === "URGENT_CARE" || careHint === "ED" || careHint === "FSED") {
    return `/app/emergency/active/${encodeURIComponent(input.id)}`;
  }
  if (type === "INPATIENT" || careHint === "INPATIENT" || careHint === "HOSPITAL") {
    return enterpriseEncounterRecordPath(input.id);
  }
  if (careHint === "OBSERVATION" || type === "OBSERVATION" || wf.includes("OBSERVATION")) {
    return enterpriseEncounterRecordPath(input.id);
  }
  // Clinic / ambulatory default — Active Clinic Workspace (D4C.5B).
  if (type === "OUTPATIENT" || type === "" || careHint === "AMBULATORY") {
    return clinicCareAmbulatoryOpenWorkspacePath(input.id);
  }
  return enterpriseEncounterRecordPath(input.id);
}

export function projectEnterprisePatientEncounterIndex(
  encounter: EnterprisePatientEncounterIndexInput,
  options?: { dentalCareEnabled?: boolean }
): EnterprisePatientEncounterIndexProjection {
  const lifecycle = projectEnterpriseEncounterListLifecycle(encounter);
  const workspace = resolveReopenWorkspaceTarget({
    encounterType: encounter.type,
    careSetting: encounter.careSetting,
    workflowState: encounter.workflowState,
  });
  return {
    isClosed: lifecycle.isClosed,
    /**
     * Lock means Encounter.status === CLOSED only.
     * Provider documentation SIGNED alone never sets this flag
     * (projectEnterpriseEncounterListLifecycle ignores providerDocumentationStatus).
     */
    showClosedLock: lifecycle.isClosed,
    closedAt: lifecycle.closedAt,
    displayMode: resolveEnterpriseEncounterDisplayMode(encounter.status),
    href: resolveEnterprisePatientEncounterIndexHref(encounter, options),
    careSetting: workspace.careSetting,
    workspaceHubTarget: workspace.workspaceTarget,
  };
}

/** Patient page must not host a second closed clinical-record composition. */
export function patientPageMustNotEmbedClosedClinicalRecord(source: string): boolean {
  return (
    !source.includes("EnterpriseClosedEncounterClinicalRecord") &&
    !source.includes("EnterpriseClosedEncounterViewer")
  );
}
