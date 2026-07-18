import { apiFetch } from "@/lib/apiClient";

const API_BASE = "/api/backend/medications/safety-knowledge";

export type SafetyKnowledgeDashboard = {
  interactionsTotal: number;
  interactionsApproved: number;
  interactionsDraft: number;
  unresolvedIdentityCandidates: number;
  possibleDuplicates: number;
  conflicts: number;
  allergenMappings: number;
  crossReactivityRules: number;
  therapeuticClasses: number;
  classMemberships: number;
  duplicateTherapyGroups: number;
  duplicateTherapyRules: number;
  missingProvenance: number;
  futureCdsEligible: number;
  clinicallyActivatedRecords: number;
  automaticClinicalActivationEnabled: boolean;
  patientSpecificEvaluationEnabled: boolean;
  interactionAlertsEnabled: boolean;
  allergyAlertsEnabled: boolean;
  duplicateTherapyAlertsEnabled: boolean;
  orderBlockingEnabled: boolean;
};

export type SafetyInteractionRow = {
  id: string;
  status: string;
  severity: string;
  interactionType: string;
  directional: boolean;
  normalizedPairKey: string;
  futureAlertEligible: boolean;
  clinicalActivationAllowed: boolean;
  evidenceLevel?: string | null;
  subjectMedicationConceptId?: string | null;
  objectMedicationConceptId?: string | null;
};

export async function fetchSafetyKnowledgeDashboard(
  facilityId: string
): Promise<SafetyKnowledgeDashboard> {
  return (await apiFetch(`${API_BASE}/dashboard`, {
    facilityId,
  })) as SafetyKnowledgeDashboard;
}

export async function fetchSafetyInteractions(
  facilityId: string,
  opts?: { status?: string; limit?: number }
): Promise<{ rows: SafetyInteractionRow[]; total: number }> {
  const params = new URLSearchParams();
  if (opts?.status) params.set("status", opts.status);
  if (opts?.limit) params.set("limit", String(opts.limit));
  const q = params.toString();
  return (await apiFetch(`${API_BASE}/interactions${q ? `?${q}` : ""}`, {
    facilityId,
  })) as { rows: SafetyInteractionRow[]; total: number };
}

export async function fetchSafetyInteraction(
  facilityId: string,
  id: string
): Promise<SafetyInteractionRow & Record<string, unknown>> {
  return (await apiFetch(`${API_BASE}/interactions/${encodeURIComponent(id)}`, {
    facilityId,
  })) as SafetyInteractionRow & Record<string, unknown>;
}

export async function transitionSafetyInteraction(
  facilityId: string,
  id: string,
  body: { toStatus: string; rationale: string }
): Promise<unknown> {
  return apiFetch(`${API_BASE}/interactions/${encodeURIComponent(id)}/transition`, {
    facilityId,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function approveSafetyInteraction(
  facilityId: string,
  id: string,
  body: { rationale: string }
): Promise<unknown> {
  return apiFetch(`${API_BASE}/interactions/${encodeURIComponent(id)}/approve`, {
    facilityId,
    method: "POST",
    body: JSON.stringify(body),
  });
}
