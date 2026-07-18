import { apiFetch } from "@/lib/apiClient";

const BASE = "/api/backend/medications/recommendation-ops";

export type Phase18OpsDashboard = {
  implementationId: string;
  programKey: string;
  overallHealth: string;
  sections: Record<string, boolean>;
  ops: Record<string, unknown>;
  quality: {
    qualityScore: number;
    coverageScore: number;
    evidenceCompleteness: number;
    reviewCompleteness: number;
    explainabilityScore: number;
    reproducibilityScore: number;
    traceabilityScore: number;
  };
  safety: {
    openDriftAlerts: number;
    replayFailures: number;
    suspensionFrequency: number;
    rollbackFrequency: number;
    orderMutations: number;
    marMutations: number;
    chartMutations: number;
    enterpriseActivations: number;
  };
  drift: { openCount: number; byType: Record<string, number> };
  replayFailures: number;
  rollbacks: unknown[];
  activePilots: number;
  sealedVersions: number;
  regulatoryArtifactCount: number;
  activation: {
    enterpriseActiveAllowed: boolean;
    productionCdsEnabled: boolean;
    orderBlockingEnabled: boolean;
    orderFromRecommendationEnabled: boolean;
    marMutation: string;
    chartMutation: string;
    autoOrderEnabled: boolean;
  };
  banner: {
    operationalGovernance: boolean;
    noAutonomyIncrease: boolean;
    advisoryOnly: boolean;
    noRegulatoryApprovalClaim: boolean;
  };
};

export async function fetchPhase18OpsDashboard(facilityId: string) {
  return (await apiFetch(`${BASE}/dashboard`, {
    facilityId,
  })) as Phase18OpsDashboard;
}

export async function fetchPhase18Readiness(facilityId: string) {
  return (await apiFetch(`${BASE}/readiness`, {
    facilityId,
  })) as Record<string, unknown>;
}

export async function sealPhase18Immutable(facilityId: string) {
  return (await apiFetch(`${BASE}/seal-immutable`, {
    facilityId,
    method: "POST",
    body: JSON.stringify({}),
  })) as Record<string, unknown>;
}

export async function detectPhase18Drift(facilityId: string) {
  return (await apiFetch(`${BASE}/drift/detect`, {
    facilityId,
    method: "POST",
    body: JSON.stringify({}),
  })) as Record<string, unknown>;
}

export async function generatePhase18Regulatory(facilityId: string) {
  return (await apiFetch(`${BASE}/regulatory/generate`, {
    facilityId,
    method: "POST",
    body: JSON.stringify({}),
  })) as Record<string, unknown>;
}

export async function fetchPhase18DriftAlerts(facilityId: string) {
  return (await apiFetch(`${BASE}/drift/alerts`, {
    facilityId,
  })) as unknown[];
}
