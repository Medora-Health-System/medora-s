import { apiFetch } from "@/lib/apiClient";

const BASE = "/api/backend/medications/recommendations";

export type Phase16RecommendationRow = {
  id: string;
  definitionKey: string;
  familyKey: string;
  recommendationKind: string;
  title: string;
  reasonSummary: string;
  lifecycleStatus: string;
  version: string;
  confidenceScore: number;
  evidenceCompleteness: number;
  evidenceLevel: string | null;
  recommendationStrength: string | null;
  validationStatus: string;
  approvalStatus: string;
  approvedByUserId: string | null;
  approvedAt: string | null;
  exposable: boolean;
  structuredPayload: Record<string, unknown> | null;
  evidenceLinkCount: number;
  orderFromRecommendationAllowed: boolean;
  clinicalActivation: boolean;
};

export type Phase16Dashboard = {
  implementationId: string;
  programKey: string;
  wave1Families: string[];
  queue: Phase16RecommendationRow[];
  byLifecycleStatus: Record<string, number>;
  analytics: Record<string, unknown>;
  activation: {
    shadowRecommendationAllowed: boolean;
    controlledPilotAllowed: boolean;
    enterpriseActiveAllowed: boolean;
    clinicalActivationAllowed: boolean;
    orderFromRecommendationAllowed: boolean;
    ceiling: string;
  };
  banner: {
    knowledgeGovernanceOnly: boolean;
    shadowModeOnly: boolean;
    noProductionCds: boolean;
    noOrderFromRecommendation: boolean;
  };
  acetaminophenIdentityBlocked: boolean;
  clinicalActivations: number;
  providerAlerts: number;
  orderBlocks: number;
  productionCds: string;
  recentAudits: Array<{
    id: string;
    action: string;
    entityType: string;
    performedAt: string;
    reason: string | null;
  }>;
};

export async function fetchPhase16RecommendationDashboard(facilityId: string) {
  return (await apiFetch(`${BASE}/governance/dashboard`, {
    facilityId,
  })) as Phase16Dashboard;
}

export async function fetchPhase16ExposableRecommendations(facilityId: string) {
  return (await apiFetch(`${BASE}?exposableOnly=true`, {
    facilityId,
  })) as Phase16RecommendationRow[];
}

export async function fetchPhase16RecommendationExplanation(
  facilityId: string,
  id: string
) {
  return (await apiFetch(`${BASE}/${id}/explanation`, {
    facilityId,
  })) as Record<string, unknown>;
}

export async function seedPhase16Recommendations(facilityId: string) {
  return (await apiFetch(`${BASE}/seed`, {
    facilityId,
    method: "POST",
    body: JSON.stringify({}),
  })) as Record<string, unknown>;
}

export async function promotePhase16ToShadow(facilityId: string) {
  return (await apiFetch(`${BASE}/promote-shadow`, {
    facilityId,
    method: "POST",
    body: JSON.stringify({}),
  })) as Record<string, unknown>;
}

export async function reviewPhase16Recommendation(
  facilityId: string,
  id: string,
  body: {
    decision: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED" | "DEFERRED";
    rationale: string;
    promoteToShadow?: boolean;
  }
) {
  return (await apiFetch(`${BASE}/${id}/review`, {
    facilityId,
    method: "POST",
    body: JSON.stringify(body),
  })) as Record<string, unknown>;
}

export async function shadowEvaluatePhase16(
  facilityId: string,
  body?: { patientId?: string; encounterId?: string }
) {
  return (await apiFetch(`${BASE}/shadow/evaluate`, {
    facilityId,
    method: "POST",
    body: JSON.stringify({ facilityId, ...body }),
  })) as Record<string, unknown>;
}

export async function submitPhase16Feedback(
  facilityId: string,
  id: string,
  body: {
    feedbackType:
      | "ACKNOWLEDGED"
      | "ACCEPTED_AS_INFORMATION"
      | "REJECTED"
      | "OVERRIDE_DOCUMENTED";
    overrideReason?: string;
    notes?: string;
    encounterId?: string;
    evaluationId?: string;
  }
) {
  return (await apiFetch(`${BASE}/${id}/feedback`, {
    facilityId,
    method: "POST",
    body: JSON.stringify({ facilityId, ...body }),
  })) as Record<string, unknown>;
}
