import { apiFetch } from "@/lib/apiClient";

const API_BASE = "/api/backend/medications/evidence-governance";

export type EvidenceGovernanceDashboard = {
  BatchKey: string | null;
  BatchStatus: string | null;
  Wave1Families: string[];
  TargetFamilyCount: number;
  FamiliesWithProvenance: number;
  EvidenceLinksCreated: number;
  PlaceholdersRetired: number;
  SourceRegistrations: number;
  AverageOverallCompleteness: number;
  AverageProvenanceScore: number;
  KnowledgeWithoutProvenance: number;
  ClinicalApprovedForShadow: number;
  ProviderFacingAlerts: number;
  OrderBlocks: number;
  ClinicalActivations: number;
  OrderingChanged: string;
  MARChanged: string;
  BillingChanged: string;
  KnowledgeControlsPatientCare: boolean;
  FamilyScores: Array<{
    familyKey: string;
    overallScore: number;
    provenanceScore: number;
    evidenceLinkCount: number;
  }>;
};

export async function fetchEvidenceGovernanceDashboard(facilityId: string) {
  return (await apiFetch(`${API_BASE}/dashboard`, {
    facilityId,
  })) as EvidenceGovernanceDashboard;
}

export async function runEvidenceGovernancePipeline(facilityId: string) {
  return (await apiFetch(`${API_BASE}/pipeline`, {
    facilityId,
    method: "POST",
    body: JSON.stringify({}),
  })) as Record<string, unknown>;
}
