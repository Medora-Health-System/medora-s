/**
 * D3E.6 — client for Hospital Care operational dashboard.
 */

import { apiFetch } from "@/lib/apiClient";

export type HospitalCareDashboardResponse = {
  facilityId: string;
  generatedAt: string;
  placementAvailability: "ENABLED" | "FEATURE_DISABLED";
  capabilities: {
    emergencyDepartment: boolean;
    observation: boolean;
    inpatient: boolean;
    directAdmission: boolean;
    bedManagement: boolean;
    transfers: boolean;
    placementWorkflow: boolean;
    receivingEncounters: boolean;
  };
  counts: {
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
  };
  attention: Array<{ code: string; count: number; severity: string }>;
  recentActivity: Array<{
    id: string;
    kind: string;
    occurredAt: string;
    label: string;
    destination?: string | null;
  }>;
  emptyGuidance: {
    boardEmpty: boolean;
    observationOptional: true;
    directInpatientSupported: boolean;
  };
  diagnostics?: {
    reason?: string;
    hint?: string;
    mismatches?: Array<{ name: string; serverEnabled: boolean; clientEnabled: boolean }>;
  } | null;
};

export async function fetchHospitalCareDashboard(): Promise<HospitalCareDashboardResponse> {
  return apiFetch("/hospital-care/dashboard") as Promise<HospitalCareDashboardResponse>;
}

export type HospitalCareMetaResponse = {
  flags: Record<string, boolean>;
  mismatches: Array<{ name: string; serverEnabled: boolean; clientEnabled: boolean }>;
  developmentDiagnosticsVisible: boolean;
  productionDefaultsOff: boolean;
};

export async function fetchHospitalCareMeta(): Promise<HospitalCareMetaResponse> {
  return apiFetch("/hospital-care/meta") as Promise<HospitalCareMetaResponse>;
}
