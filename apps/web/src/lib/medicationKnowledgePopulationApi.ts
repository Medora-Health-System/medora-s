import { apiFetch } from "@/lib/apiClient";

const API_BASE = "/api/backend/medications/knowledge-population";

export type KnowledgePopulationDashboard = {
  BatchFamilies: number;
  IdentityResolvedFamilies: number;
  IdentityBlockedFamilies: number;
  ClinicalDraftRecords: number;
  ClinicalApprovedRecords: number;
  SafetyDraftRecords: number;
  SafetyApprovedRecords: number;
  RecordsWithoutSources: number;
  ShadowEvaluableFamilies: number;
  ValidatedFamilies: number;
  ClinicalActivations: number;
  ProviderFacingAlerts: number;
  OrderBlocks: number;
  OpenConflicts: number;
  BlockingConflicts: number;
  batchStatus: string | null;
};

export async function fetchKnowledgePopulationDashboard(facilityId: string) {
  return (await apiFetch(`${API_BASE}/dashboard`, {
    facilityId,
  })) as KnowledgePopulationDashboard;
}

export async function fetchKnowledgePopulationBatches(facilityId: string) {
  return (await apiFetch(`${API_BASE}/batches`, { facilityId })) as Array<
    Record<string, unknown>
  >;
}

export async function createKnowledgePopulationBatch(facilityId: string) {
  return (await apiFetch(`${API_BASE}/batches`, {
    facilityId,
    method: "POST",
    body: JSON.stringify({}),
  })) as Record<string, unknown>;
}

export async function resolveKnowledgePopulationBatch(
  facilityId: string,
  batchId: string
) {
  return (await apiFetch(
    `${API_BASE}/batches/${encodeURIComponent(batchId)}/manifest/resolve`,
    { facilityId, method: "POST", body: JSON.stringify({}) }
  )) as Record<string, unknown>;
}

export async function previewKnowledgePopulationBatch(
  facilityId: string,
  batchId: string
) {
  return (await apiFetch(
    `${API_BASE}/batches/${encodeURIComponent(batchId)}/preview`,
    { facilityId, method: "POST", body: JSON.stringify({}) }
  )) as Record<string, unknown>;
}

export async function executeKnowledgePopulationDrafts(
  facilityId: string,
  batchId: string
) {
  return (await apiFetch(
    `${API_BASE}/batches/${encodeURIComponent(batchId)}/execute-drafts`,
    { facilityId, method: "POST", body: JSON.stringify({}) }
  )) as Record<string, unknown>;
}

export async function fetchKnowledgePopulationBatch(
  facilityId: string,
  batchId: string
) {
  return (await apiFetch(
    `${API_BASE}/batches/${encodeURIComponent(batchId)}`,
    { facilityId }
  )) as Record<string, unknown>;
}
