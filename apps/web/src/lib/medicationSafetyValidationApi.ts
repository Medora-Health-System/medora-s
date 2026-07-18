import { apiFetch } from "@/lib/apiClient";

const API_BASE = "/api/backend/medications/safety-validation";

export type SafetyValidationDashboard = {
  MedicationFamiliesPresent: number;
  MedicationFamiliesShadowEvaluable: number;
  MedicationFamiliesValidated: number;
  MedicationFamiliesBlocked: number;
  ClinicalKnowledgeCoverage: number;
  SafetyKnowledgeCoverage: number;
  IdentityCoverage: number;
  ReviewedFindings: number;
  AdjudicatedFindings: number;
  KnowledgeGapCount: number;
  IdentityGapCount: number;
  ContextGapCount: number;
  ReadinessCandidates: number;
  ReadyForGovernanceReview: number;
  ClinicalActivations: number;
  ProviderFacingAlerts: number;
  OrderBlocks: number;
  TotalMedicationConcepts: number;
  TotalMedicationProducts: number;
  TotalMedicationPackages: number;
  TotalCatalogMedications: number;
  EmergencyMedicineMedicationFamilies: number;
  EmergencyMedicineMedicationFamilyNames: string[];
  banner?: {
    shadowValidationOnly: boolean;
    noProviderAlerts: boolean;
    noOrderBlocking: boolean;
    noClinicalActivation: boolean;
  };
};

export async function fetchSafetyValidationDashboard(facilityId: string) {
  return (await apiFetch(`${API_BASE}/coverage/dashboard`, {
    facilityId,
  })) as SafetyValidationDashboard;
}

export async function fetchSafetyValidationFamilies(facilityId: string) {
  return (await apiFetch(`${API_BASE}/coverage/families?limit=100`, {
    facilityId,
  })) as Array<Record<string, unknown>>;
}

export async function fetchSafetyValidationCases(facilityId: string) {
  return (await apiFetch(`${API_BASE}/cases?limit=50`, {
    facilityId,
  })) as Array<Record<string, unknown>>;
}

export async function fetchSafetyValidationBatches(facilityId: string) {
  return (await apiFetch(`${API_BASE}/batches`, {
    facilityId,
  })) as Array<Record<string, unknown>>;
}

export async function fetchSafetyValidationAnalytics(
  facilityId: string,
  kind:
    | "accuracy"
    | "severity"
    | "burden"
    | "emergency-contexts"
    | "reliability"
    | "suppressions"
) {
  return (await apiFetch(`${API_BASE}/analytics/${kind}`, {
    facilityId,
  })) as Record<string, unknown>;
}

export async function fetchSafetyValidationGaps(facilityId: string) {
  return (await apiFetch(`${API_BASE}/coverage/gaps`, {
    facilityId,
  })) as Record<string, unknown>;
}

export async function fetchSafetyValidationReadiness(facilityId: string) {
  const [policies, assessments, candidates, attestations] = await Promise.all([
    apiFetch(`${API_BASE}/readiness/policies`, { facilityId }),
    apiFetch(`${API_BASE}/readiness/assessments`, { facilityId }),
    apiFetch(`${API_BASE}/readiness/candidates`, { facilityId }),
    apiFetch(`${API_BASE}/readiness/attestations`, { facilityId }),
  ]);
  return {
    policies: policies as Array<Record<string, unknown>>,
    assessments: assessments as Array<Record<string, unknown>>,
    candidates: candidates as Array<Record<string, unknown>>,
    attestations: attestations as Array<Record<string, unknown>>,
  };
}

export async function recalculateSafetyValidationCoverage(facilityId: string) {
  return (await apiFetch(`${API_BASE}/coverage/recalculate`, {
    facilityId,
    method: "POST",
    body: JSON.stringify({}),
  })) as Record<string, unknown>;
}
