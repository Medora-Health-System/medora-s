import { apiFetch } from "@/lib/apiClient";

const BASE = "/api/backend/medications/remediation";

export type Phase15Dashboard = {
  implementationId: string;
  certificationClaimed: boolean;
  certificationLabel?: string;
  notProductionClinicalActivation?: boolean;
  liveBaseline: {
    Wave1Families: number;
    ApprovedForShadow: number;
    OpenPhase14BGaps: number;
    OpenTier1KnowledgeGaps: number;
    OpenWorkItems: number;
    ResolvedWorkItems: number;
    BlockedWorkItems: number;
    DeferredWorkItems?: number;
    WorkItemsByStatus: Record<string, number>;
    SourcesByLifecycle: Record<string, number>;
    SyntheticReadiness: string | null;
    OperationalReadiness: string;
    FinalReadiness?: string;
    CertificationDecision?: string | null;
    CertificationLimitations?: string[];
    AcetaminophenIdentityBlocked: boolean;
    ClinicalActivations: number;
    ProviderAlerts: number;
    OrderBlocks: number;
    ProductionCds: string;
  };
  banner: {
    administrativeOnly: boolean;
    noProductionCds: boolean;
    noPatientCareWorkflowImpact: boolean;
    knowledgeGovernanceCertificationOnly?: boolean;
  };
  Families: Array<{
    familyName: string;
    familyKey: string;
    openGaps: number;
    workItemsOpen: number;
    workItemsBlocked: number;
    workItemsResolved: number;
    approvalStatus: string;
    identityStatus: string;
  }>;
  Acetaminophen?: {
    identityStatus: string;
    wave1Member: boolean;
  };
  Remediations: Array<{
    id: string;
    familyKey: string;
    gapCategory: string;
    gapCategoryDisplay: string;
    status: string;
    severity: string;
    title: string;
    description: string;
    blockingReason: string | null;
    eligibleNextActions: string[];
    updatedAt: string;
  }>;
};

export async function fetchPhase15Dashboard(facilityId: string) {
  return (await apiFetch(`${BASE}/dashboard`, {
    facilityId,
  })) as Phase15Dashboard;
}

export async function refreshPhase15Remediations(facilityId: string) {
  return (await apiFetch(`${BASE}/work-items/refresh`, {
    facilityId,
    method: "POST",
    body: JSON.stringify({}),
  })) as Record<string, unknown>;
}

export async function previewPhase15Transition(
  facilityId: string,
  workItemId: string,
  toStatus: string
) {
  return (await apiFetch(`${BASE}/work-items/${workItemId}/preview`, {
    facilityId,
    method: "POST",
    body: JSON.stringify({ toStatus }),
  })) as Record<string, unknown>;
}

export async function transitionPhase15WorkItem(
  facilityId: string,
  workItemId: string,
  body: { toStatus: string; reason: string; expectedStatus?: string }
) {
  return (await apiFetch(`${BASE}/work-items/${workItemId}/transition`, {
    facilityId,
    method: "POST",
    body: JSON.stringify(body),
  })) as Record<string, unknown>;
}

export async function deferPhase15WorkItem(
  facilityId: string,
  workItemId: string,
  reason: string
) {
  return (await apiFetch(`${BASE}/work-items/${workItemId}/defer`, {
    facilityId,
    method: "POST",
    body: JSON.stringify({ reason }),
  })) as Record<string, unknown>;
}
