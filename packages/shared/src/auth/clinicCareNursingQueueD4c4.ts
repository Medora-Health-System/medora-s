/**
 * MEDUI.D4C.4 — Ambulatory nursing / MA queue stage projection.
 * Maps canonical EncounterWorkflowState (+ clinic stage) onto nursing queue buckets.
 * Presentation-only — no parallel ClinicNursingStatus table.
 */

import { projectClinicCareStage, type ClinicCareStageId } from "./clinicCareTrackboardProjectionD4c2.js";
export {
  projectClinicCareIntakeStatus,
  type ClinicCareIntakeStatus,
  type ClinicCareIntakeStatusProjection,
} from "./clinicCareNursingIntakeStatusD4c4.js";

export const CLINIC_CARE_NURSING_QUEUE_STAGES = [
  "WAITING_FOR_INTAKE",
  "IN_PROGRESS",
  "READY_FOR_PROVIDER",
  "RETURNED",
  "COMPLETED",
] as const;

export type ClinicCareNursingQueueStage = (typeof CLINIC_CARE_NURSING_QUEUE_STAGES)[number];

/**
 * Canonical ambulatory nursing queue mapping (audit-backed):
 * - ARRIVED → Waiting for intake
 * - TRIAGE → In progress (intake underway)
 * - IN_TREATMENT / DISPOSITION → Ready for provider (provider eval lane)
 * - RESULTS_PENDING → Returned (diagnostics / return-to-nursing)
 * - CLOSED → Completed
 * - DISCHARGE_READY / FINALIZED → Ready for provider (exit path; nursing may still assist)
 */
export function projectClinicCareNursingQueueStage(input: {
  workflowState?: string | null;
  encounterStatus?: string | null;
  resultsPendingCount?: number | null;
}): ClinicCareNursingQueueStage {
  const status = String(input.encounterStatus ?? "")
    .trim()
    .toUpperCase();
  const wf = String(input.workflowState ?? "")
    .trim()
    .toUpperCase();

  if (status === "CLOSED" || wf === "CLOSED") return "COMPLETED";
  if (status === "CANCELLED") return "COMPLETED";

  if (wf === "ARRIVED" || !wf) return "WAITING_FOR_INTAKE";
  if (wf === "TRIAGE") return "IN_PROGRESS";
  if (wf === "RESULTS_PENDING") return "RETURNED";
  if (wf === "IN_TREATMENT" || wf === "DISPOSITION") return "READY_FOR_PROVIDER";
  if (wf === "DISCHARGE_READY" || wf === "FINALIZED") return "READY_FOR_PROVIDER";

  const clinicStage: ClinicCareStageId = projectClinicCareStage(input).stageId;
  switch (clinicStage) {
    case "WAITING":
      return "WAITING_FOR_INTAKE";
    case "IN_PROGRESS":
      return "READY_FOR_PROVIDER";
    case "RESULTS_PENDING":
      return "RETURNED";
    case "COMPLETED":
      return "COMPLETED";
    case "DISCHARGE_PENDING":
      return "READY_FOR_PROVIDER";
    default:
      return "WAITING_FOR_INTAKE";
  }
}

/** Next workflow transition for “start intake” / “ready for provider” (enterprise machine). */
export function clinicCareNursingNextWorkflowTransition(
  workflowState: string | null | undefined
): "TRIAGE" | "IN_TREATMENT" | null {
  const wf = String(workflowState ?? "")
    .trim()
    .toUpperCase();
  if (wf === "ARRIVED" || !wf) return "TRIAGE";
  if (wf === "TRIAGE") return "IN_TREATMENT";
  return null;
}

/**
 * Canonical ambulatory intake chart deep-link (enterprise encounter chrome).
 * Triage tab hosts vitals/intake; history tab hosts allergies / home meds.
 * No ClinicIntake* form clone.
 */
export function clinicCareAmbulatoryIntakeChartPath(
  encounterId: string,
  section: "intake" | "history" = "intake"
): string {
  const id = encodeURIComponent(encounterId);
  if (section === "history") return `/app/encounters/${id}?tab=history`;
  return `/app/encounters/${id}?tab=triage`;
}

/** PATIENT_CARE_TECH → enterprise TECHNICIAN slot (typed compatibility adapter). */
export const CLINIC_CARE_MA_ASSIGNMENT_SLOT = "TECHNICIAN" as const;

export type ClinicCareMaAssignmentAdapter = {
  roleCode: "PATIENT_CARE_TECH";
  enterpriseSlot: typeof CLINIC_CARE_MA_ASSIGNMENT_SLOT;
  ambulatoryNativeRoleDeferred: true;
  note: string;
};

export const CLINIC_CARE_MA_ASSIGNMENT_ADAPTER: ClinicCareMaAssignmentAdapter = {
  roleCode: "PATIENT_CARE_TECH",
  enterpriseSlot: CLINIC_CARE_MA_ASSIGNMENT_SLOT,
  ambulatoryNativeRoleDeferred: true,
  note:
    "Ambulatory MA uses PATIENT_CARE_TECH with enterprise hospital TECHNICIAN assignment slot until an ambulatory-native MA RoleCode ships.",
};
