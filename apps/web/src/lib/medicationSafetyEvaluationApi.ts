import { apiFetch } from "@/lib/apiClient";

const API_BASE = "/api/backend/medications/safety-evaluation";

export type SafetyEvaluationDashboard = {
  operatingMode: string;
  evaluationRuns: number;
  completedRuns: number;
  failedRuns: number;
  findings: number;
  interactionFindings: number;
  allergyFindings: number;
  duplicateTherapyFindings: number;
  renalFindings: number;
  hepaticFindings: number;
  pregnancyFindings: number;
  doseReviewFindings: number;
  insufficientContextFindings: number;
  unresolvedIdentities: number;
  suppressedFindings: number;
  duplicateFindingsPrevented: number;
  providerFacingAlerts: number;
  orderBlocks: number;
  medianEvaluationDurationMs: number | null;
  p95EvaluationDurationMs: number | null;
};

export type SafetyEvaluationRunRow = {
  id: string;
  status: string;
  operatingMode: string;
  triggerType: string;
  findingsCreated: number;
  findingsSuppressed: number;
  findingsDeduplicated: number;
  durationMs?: number | null;
  requestedAt: string;
};

export async function fetchSafetyEvaluationDashboard(
  facilityId: string
): Promise<SafetyEvaluationDashboard> {
  return (await apiFetch(`${API_BASE}/dashboard`, {
    facilityId,
  })) as SafetyEvaluationDashboard;
}

export async function fetchSafetyEvaluationRuns(
  facilityId: string,
  opts?: { status?: string; limit?: number }
): Promise<{ rows: SafetyEvaluationRunRow[]; total: number }> {
  const params = new URLSearchParams();
  if (opts?.status) params.set("status", opts.status);
  if (opts?.limit) params.set("limit", String(opts.limit));
  const q = params.toString();
  return (await apiFetch(`${API_BASE}/runs${q ? `?${q}` : ""}`, {
    facilityId,
  })) as { rows: SafetyEvaluationRunRow[]; total: number };
}

export async function fetchSafetyEvaluationRun(
  facilityId: string,
  id: string
): Promise<SafetyEvaluationRunRow & Record<string, unknown>> {
  return (await apiFetch(`${API_BASE}/runs/${encodeURIComponent(id)}`, {
    facilityId,
  })) as SafetyEvaluationRunRow & Record<string, unknown>;
}
