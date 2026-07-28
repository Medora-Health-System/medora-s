import { genericEncounterPath } from "@/features/emergency/emergencyRoutes";
import {
  clinicCareAmbulatoryOpenWorkspacePath,
  clinicCareAmbulatoryProviderChartPath,
} from "@medora/shared";
import { CLINIC_CARE_TODAYS_VISITS } from "./clinicCarePaths";

/** Patient longitudinal chart (enterprise patient engine — no ClinicPatientChart). */
export function clinicPatientChartPath(patientId: string): string {
  return `/app/patients/${encodeURIComponent(patientId)}`;
}

/**
 * Primary patient-name destination from Clinic Care trackboard / provider worklist.
 * Closed → patient chart; open → Active Clinic Workspace (D4C.5B).
 * `facilityId` is session-scoped (x-facility-id), same as ED boards.
 */
export function resolveClinicBoardPatientNameHref(input: {
  encounterId: string;
  patientId: string;
  status?: string | null;
  workflowState?: string | null;
  facilityId?: string | null;
  ambulatoryProviderChart?: boolean;
  fromTodaysVisits?: boolean;
}): string {
  void input.facilityId;
  const closed =
    input.status === "CLOSED" ||
    input.workflowState === "CLOSED" ||
    input.status === "SIGNED";
  if (closed && input.patientId) {
    return clinicPatientChartPath(input.patientId);
  }
  if (input.ambulatoryProviderChart !== false) {
    const base = clinicCareAmbulatoryOpenWorkspacePath(input.encounterId);
    if (input.fromTodaysVisits) {
      return `${base}&from=todays-visits`;
    }
    return base;
  }
  return genericEncounterPath(input.encounterId);
}

/** @deprecated Prefer resolveClinicBoardPatientNameHref — retained for D4C.5 imports. */
export function clinicCareBoardAmbulatoryHref(encounterId: string): string {
  return clinicCareAmbulatoryProviderChartPath(encounterId);
}

export { CLINIC_CARE_TODAYS_VISITS };

/** Role-gated clinical action link inside Clinic workspace hubs when possible. */
export function resolveClinicBoardActionHref(input: {
  encounterId: string;
  stageId: string;
  canAuthorProviderDocumentation?: boolean;
  canAccessNursingMa?: boolean;
  canAccessTechnicianSafeNursingMaProjection?: boolean;
  canAccessEncounters?: boolean;
  canAccessPatients?: boolean;
  canCompleteDispositionOrEncounter?: boolean;
  showClinicalActionLinks?: boolean;
  allowDischargeActions?: boolean;
}): string {
  const {
    encounterId,
    stageId,
    canAuthorProviderDocumentation,
    canAccessNursingMa,
    canAccessTechnicianSafeNursingMaProjection,
    canAccessEncounters,
    canAccessPatients,
    showClinicalActionLinks,
    allowDischargeActions,
  } = input;

  if (stageId === "DISCHARGE_PENDING" && allowDischargeActions) {
    return canAuthorProviderDocumentation
      ? `/app/clinic-care/provider?encounterId=${encodeURIComponent(encounterId)}`
      : `/app/clinic-care/nursing?encounterId=${encodeURIComponent(encounterId)}`;
  }
  if (showClinicalActionLinks && canAuthorProviderDocumentation) {
    return `/app/clinic-care/provider?encounterId=${encodeURIComponent(encounterId)}`;
  }
  if (
    showClinicalActionLinks &&
    (canAccessNursingMa || canAccessTechnicianSafeNursingMaProjection)
  ) {
    return `/app/clinic-care/nursing?encounterId=${encodeURIComponent(encounterId)}`;
  }
  if (canAccessEncounters) return "/app/clinic-care/encounters";
  if (canAccessPatients) return "/app/clinic-care/patients";
  return "/app/clinic-care";
}
