/**
 * D3E.6A — Hospital Care census + dashboard client.
 */

import { apiFetch } from "@/lib/apiClient";
import type { HospitalCensusPatientRow as SharedHospitalCensusPatientRow } from "@medora/shared";
import type { HospitalCareDashboardResponse } from "./hospitalCareDashboardApi";

export type HospitalCensusPatientRow = SharedHospitalCensusPatientRow;

export type HospitalCensusResponse = {
  facilityId: string;
  generatedAt: string;
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
    bedsTotal: number | null;
    bedsAvailable: number | null;
    bedsOccupied: number | null;
    bedsCleaning: number | null;
    bedsBlocked: number | null;
  };
  observationPatients: HospitalCensusPatientRow[];
  inpatientPatients: HospitalCensusPatientRow[];
  allHospitalPatients: HospitalCensusPatientRow[];
  operationalSnapshot: {
    scope: string;
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
  diagnostics: Array<{ code: string; severity: string; detail: string }>;
  emptyGuidance: {
    observationEmpty: boolean;
    inpatientEmpty: boolean;
    placementEmpty: boolean;
    hospitalEmpty: boolean;
  };
};

export type HospitalCareDashboardWithCensus = HospitalCareDashboardResponse & {
  census?: HospitalCensusResponse;
};

export async function fetchHospitalCensus(
  scope: "ALL_HOSPITAL_CARE" | "OBSERVATION" | "INPATIENT" = "ALL_HOSPITAL_CARE",
  options?: { facilityId?: string | null }
): Promise<HospitalCensusResponse> {
  const facilityId = options?.facilityId?.trim() || undefined;
  return apiFetch(`/hospital-care/census?scope=${encodeURIComponent(scope)}`, {
    facilityId,
  }) as Promise<HospitalCensusResponse>;
}

export { fetchHospitalCareDashboard, fetchHospitalCareMeta } from "./hospitalCareDashboardApi";
export type { HospitalCareDashboardResponse, HospitalCareMetaResponse } from "./hospitalCareDashboardApi";
