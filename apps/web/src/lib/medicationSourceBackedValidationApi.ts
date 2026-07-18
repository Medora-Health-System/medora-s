import { apiFetch } from "@/lib/apiClient";

const API_BASE = "/api/backend/medications/source-backed-validation";

export type SourceBackedDashboard = {
  RequestedFamilies: number;
  ResolvedFamilies: number;
  IdentityBlockedFamilies: number;
  Wave1SelectedFamilies: number;
  Wave1FamilyNames: string[];
  SourceReadyFamilies: number;
  ClinicalDraftRecords: number;
  ClinicalRecordsApprovedForShadow: number;
  SafetyDraftRecords: number;
  SafetyRecordsApprovedForShadow: number;
  FamiliesShadowEvaluable: number;
  AcetaminophenResolutionStatus: string;
  ReferenceCases: number;
  ReferenceCasesPassed: number;
  MatchedFindings: number;
  MissedFindings: number;
  UnexpectedFindings: number;
  ConfirmedFalsePositives: number;
  CriticalMisses: number;
  OpenKnowledgeGaps: number;
  OpenIdentityGaps: number;
  OpenEngineGaps: number;
  P95Latency: number;
  ProviderFacingAlerts: number;
  OrderBlocks: number;
  ClinicalActivations: number;
  ReadinessResult: string;
};

export async function fetchSourceBackedDashboard(facilityId: string) {
  return (await apiFetch(`${API_BASE}/dashboard`, {
    facilityId,
  })) as SourceBackedDashboard;
}

export async function runSourceBackedInvestigate(facilityId: string) {
  return (await apiFetch(`${API_BASE}/identity-cases/investigate`, {
    facilityId,
    method: "POST",
    body: JSON.stringify({}),
  })) as Record<string, unknown>;
}

export async function createSourceBackedWave(facilityId: string) {
  return (await apiFetch(`${API_BASE}/waves`, {
    facilityId,
    method: "POST",
    body: JSON.stringify({}),
  })) as Record<string, unknown>;
}

export async function runSourceBackedShadow(facilityId: string) {
  return (await apiFetch(`${API_BASE}/shadow-runs`, {
    facilityId,
    method: "POST",
    body: JSON.stringify({}),
  })) as Record<string, unknown>;
}
