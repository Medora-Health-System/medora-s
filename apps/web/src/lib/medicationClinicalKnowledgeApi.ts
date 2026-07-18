import { apiFetch } from "@/lib/apiClient";

const API_BASE = "/api/backend/medications/clinical-knowledge";

export type ClinicalKnowledgeDashboard = {
  profilesTotal: number;
  draftCount: number;
  underReviewCount: number;
  approvedCount: number;
  sourcesCount: number;
  versionsCount: number;
  conceptsMissingEmergencyProfileEstimate: number;
  automaticClinicalActivationEnabled: false;
  clinicalDecisionSupportEnabled: false;
};

export type ClinicalKnowledgeProfileRow = {
  id: string;
  conceptId: string | null;
  productId: string | null;
  lifecycleStatus: string;
  evidenceLevel: string | null;
  knowledgeSourceLabel: string | null;
  knowledgeVersionLabel: string | null;
  clinicalActivationAllowed: boolean;
  source?: { sourceCode: string; sourceName: string };
  knowledgeVersion?: { versionLabel: string; knowledgeVersion: string };
  emergencyProfiles?: Array<{ useProfile: string }>;
};

export async function fetchClinicalKnowledgeDashboard(
  facilityId: string
): Promise<ClinicalKnowledgeDashboard> {
  return (await apiFetch(`${API_BASE}/dashboard`, {
    facilityId,
  })) as ClinicalKnowledgeDashboard;
}

export async function fetchClinicalKnowledgeProfiles(
  facilityId: string,
  params: Record<string, string | number | undefined> = {}
): Promise<{ total: number; rows: ClinicalKnowledgeProfileRow[] }> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    qs.set(key, String(value));
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return (await apiFetch(`${API_BASE}/profiles${suffix}`, {
    facilityId,
  })) as { total: number; rows: ClinicalKnowledgeProfileRow[] };
}

export async function fetchClinicalKnowledgeProfile(
  facilityId: string,
  id: string
): Promise<ClinicalKnowledgeProfileRow & Record<string, unknown>> {
  return (await apiFetch(`${API_BASE}/profiles/${encodeURIComponent(id)}`, {
    facilityId,
  })) as ClinicalKnowledgeProfileRow & Record<string, unknown>;
}

export async function transitionClinicalKnowledgeProfile(
  facilityId: string,
  id: string,
  body: { toStatus: string; rationale: string }
): Promise<unknown> {
  return apiFetch(`${API_BASE}/profiles/${encodeURIComponent(id)}/transition`, {
    facilityId,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function approveClinicalKnowledgeProfile(
  facilityId: string,
  id: string,
  body: { rationale: string }
): Promise<unknown> {
  return apiFetch(`${API_BASE}/profiles/${encodeURIComponent(id)}/approve`, {
    facilityId,
    method: "POST",
    body: JSON.stringify(body),
  });
}
