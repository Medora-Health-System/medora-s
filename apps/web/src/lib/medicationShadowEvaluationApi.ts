import { apiFetch } from "@/lib/apiClient";

const BASE = "/api/backend/medications/shadow-evaluation";

export type ShadowEvaluationDashboard = {
  BatchKey: string | null;
  BatchStatus: string | null;
  Readiness: string | null;
  ApprovedForShadow: number;
  ShadowSnapshots: number;
  FamiliesExecuted: number;
  FamiliesPassed: number;
  FamiliesPassedWithNoncriticalGaps: number;
  FamiliesRequiringRemediation: number;
  FamiliesFailed: number;
  ReferenceCases: number;
  MatchedFindings: number;
  MissedFindings: number;
  UnexpectedFindings: number;
  CriticalMisses: number;
  DeferredDomainSkips: number;
  OpenGaps: number;
  ClinicalActivation: number;
  ProviderFacingAlerts: number;
  FamilyResults: Array<{
    familyKey: string;
    status: string;
    casesExecuted: number;
    matchedCount: number;
    missedCount: number;
    unexpectedCount: number;
    deferredSkipCount: number;
    openGaps: number;
  }>;
  GapLinks: Array<{
    gapType: string;
    familyKey: string | null;
    description: string;
    severity: string;
    status: string;
  }>;
};

export async function fetchShadowEvaluationDashboard(facilityId: string) {
  return (await apiFetch(`${BASE}/dashboard`, {
    facilityId,
  })) as ShadowEvaluationDashboard;
}

export async function runShadowEvaluationPipeline(facilityId: string) {
  return (await apiFetch(`${BASE}/batches/pipeline`, {
    facilityId,
    method: "POST",
    body: JSON.stringify({}),
  })) as Record<string, unknown>;
}
