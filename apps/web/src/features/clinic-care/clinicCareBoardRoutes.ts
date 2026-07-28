/**
 * MEDUI.D4C.2A.1 / D4C.5 — ambulatory board patient-name → chart navigation.
 * Mirrors ED `resolveEdBoardPatientNameHref` pattern (encounter-scoped primary dest)
 * without forking ED emergency routes into Clinic.
 */

import { genericEncounterPath } from "@/features/emergency/emergencyRoutes";
import { clinicCareAmbulatoryProviderChartPath } from "@medora/shared";

/** Patient longitudinal chart (enterprise patient engine — no ClinicPatientChart). */
export function clinicPatientChartPath(patientId: string): string {
  return `/app/patients/${encodeURIComponent(patientId)}`;
}

/**
 * Primary patient-name destination from Clinic Care trackboard / provider worklist.
 * Closed → patient chart; open → generic encounter chart with ambulatory adapter query.
 * `facilityId` is session-scoped (x-facility-id), same as ED boards.
 */
export function resolveClinicBoardPatientNameHref(input: {
  encounterId: string;
  patientId: string;
  status?: string | null;
  workflowState?: string | null;
  facilityId?: string | null;
  ambulatoryProviderChart?: boolean;
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
    return clinicCareAmbulatoryProviderChartPath(input.encounterId);
  }
  return genericEncounterPath(input.encounterId);
}

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
