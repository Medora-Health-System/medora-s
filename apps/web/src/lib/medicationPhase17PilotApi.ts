import { apiFetch } from "@/lib/apiClient";

const BASE = "/api/backend/medications/recommendation-pilot";

export type Phase17PilotDashboard = {
  implementationId: string;
  programs: Array<{
    id: string;
    programKey: string;
    title: string;
    status: string;
    facilityId: string;
    controlledPilotAllowed: boolean;
    enterpriseActiveAllowed: boolean;
    startAt: string | null;
    endAt: string | null;
    definitions: unknown[];
    providers: unknown[];
    _count?: { exposures: number; safetyEvents: number };
  }>;
  qualifications: Array<{
    id: string;
    recommendationDefinitionId: string;
    facilityId: string;
    qualificationDecision: string;
    shadowEvaluationCount: number;
    confidenceScore: number;
    orderMutationCount: number;
    marMutationCount: number;
    chartMutationCount: number;
    evaluatedAt: string;
  }>;
  metrics: {
    programCount: number;
    activePilotCount: number;
    eligibleDefinitionQualifications: number;
    exposureCount: number;
    safetyEventCount: number;
  };
  activation: {
    enterpriseActiveAllowed: boolean;
    orderFromRecommendationEnabled: boolean;
    orderBlockingEnabled: boolean;
    productionCdsEnabled: boolean;
    marMutation: string;
  };
  banner: {
    controlledPilot: boolean;
    limited: boolean;
    reversible: boolean;
    nonblocking: boolean;
  };
  clinicalActivations: number;
  orderMutations: number;
  marMutations: number;
  chartMutations: number;
  enterpriseActivations: number;
};

export type Phase17Readiness = {
  readiness: string;
  activePilotCount: number;
  eligibleQualifications: number;
  enterpriseActiveAllowed: boolean;
  orderFromRecommendationEnabled: boolean;
  orderMutations: number;
  marMutations: number;
  chartMutations: number;
  productionCds: string;
};

export type Phase17EncounterAdvisories = {
  mode: "SHADOW_ONLY" | "CONTROLLED_PILOT";
  pilotBadge: boolean;
  banner?: string;
  advisories: Array<{
    exposureId: string | null;
    id?: string;
    definitionId?: string;
    title: string;
    familyKey?: string;
    recommendationKind?: string;
    reasonSummary?: string;
    structuredPayload?: Record<string, unknown> | null;
    confidenceScore?: number;
    evidenceLevel?: string | null;
    recommendationStrength?: string | null;
    approvedByUserId?: string | null;
    approvedAt?: string | null;
    version?: string;
    knowledgeVersion?: string;
    controlledPilot: boolean;
    pilotProgramId?: string;
    orderFromRecommendation: boolean;
    clinicalActivation: boolean;
    lifecycleStatus?: string;
  }>;
  orderFromRecommendation: boolean;
  clinicalActivation: boolean;
};

export async function fetchPhase17PilotDashboard(facilityId: string) {
  return (await apiFetch(`${BASE}/dashboard`, {
    facilityId,
  })) as Phase17PilotDashboard;
}

export async function fetchPhase17Readiness(facilityId: string) {
  return (await apiFetch(`${BASE}/readiness`, {
    facilityId,
  })) as Phase17Readiness;
}

export async function evaluatePhase17Qualifications(facilityId: string) {
  return (await apiFetch(`${BASE}/qualifications/evaluate-all`, {
    facilityId,
    method: "POST",
    body: JSON.stringify({ facilityId }),
  })) as Record<string, unknown>;
}

export async function fetchPhase17Programs(facilityId: string) {
  return (await apiFetch(`${BASE}/programs`, { facilityId })) as unknown[];
}

export async function fetchPhase17Program(facilityId: string, id: string) {
  return (await apiFetch(`${BASE}/programs/${id}`, {
    facilityId,
  })) as Record<string, unknown>;
}

export async function suspendPhase17Program(
  facilityId: string,
  id: string,
  reason: string
) {
  return (await apiFetch(`${BASE}/programs/${id}/suspend`, {
    facilityId,
    method: "POST",
    body: JSON.stringify({ reason }),
  })) as Record<string, unknown>;
}

export async function fetchPhase17Monitoring(facilityId: string, id: string) {
  return (await apiFetch(`${BASE}/programs/${id}/monitoring`, {
    facilityId,
  })) as Record<string, unknown>;
}

export async function fetchPhase17SafetyEvents(facilityId: string, id: string) {
  return (await apiFetch(`${BASE}/programs/${id}/safety-events`, {
    facilityId,
  })) as unknown[];
}

export async function fetchPhase17Audit(facilityId: string, id: string) {
  return (await apiFetch(`${BASE}/programs/${id}/audit`, {
    facilityId,
  })) as unknown[];
}

export async function fetchPhase17EncounterAdvisories(
  facilityId: string,
  encounterId: string
) {
  return (await apiFetch(
    `${BASE}/encounters/${encodeURIComponent(encounterId)}/advisories?facilityId=${encodeURIComponent(facilityId)}`,
    { facilityId }
  )) as Phase17EncounterAdvisories;
}

export async function acknowledgePhase17Advisory(
  facilityId: string,
  exposureId: string,
  reason?: string
) {
  return (await apiFetch(`${BASE}/advisories/${exposureId}/acknowledge`, {
    facilityId,
    method: "POST",
    body: JSON.stringify({ reason }),
  })) as Record<string, unknown>;
}

export async function dismissPhase17Advisory(
  facilityId: string,
  exposureId: string,
  reason?: string
) {
  return (await apiFetch(`${BASE}/advisories/${exposureId}/dismiss`, {
    facilityId,
    method: "POST",
    body: JSON.stringify({ reason }),
  })) as Record<string, unknown>;
}

export async function disagreePhase17Advisory(
  facilityId: string,
  exposureId: string,
  reason?: string
) {
  return (await apiFetch(`${BASE}/advisories/${exposureId}/disagree`, {
    facilityId,
    method: "POST",
    body: JSON.stringify({ reason }),
  })) as Record<string, unknown>;
}
