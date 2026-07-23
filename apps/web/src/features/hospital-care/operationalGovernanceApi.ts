/**
 * D4A.2.7A — Operational governance + inpatient operations API client.
 */

import { apiFetch } from "@/lib/apiClient";
import type {
  GovernanceDashboardKind,
  InpatientOperationalDashboardV1,
  PlacementReadinessV1,
  ChartAccessKind,
  EnterpriseOperationsPlatformManifestV1,
} from "@medora/shared";

const BASE = "/hospital-care/operational-governance";

export async function fetchEnterpriseOperationsPlatformManifest(): Promise<EnterpriseOperationsPlatformManifestV1> {
  return apiFetch(`${BASE}/platform-manifest`);
}

export async function fetchInpatientOperationalDashboard(): Promise<InpatientOperationalDashboardV1> {
  return apiFetch(`${BASE}/inpatient-dashboard`);
}

export async function fetchGovernanceDashboard(kind: GovernanceDashboardKind): Promise<Record<string, unknown>> {
  return apiFetch(`${BASE}/dashboards/${encodeURIComponent(kind)}`);
}

export async function fetchPlacementReadiness(): Promise<PlacementReadinessV1> {
  return apiFetch(`${BASE}/placement-readiness`);
}

export async function fetchAuditCenter(params?: {
  facet?: string;
  q?: string;
  encounterId?: string;
}): Promise<{
  editable: false;
  events: Array<{
    id: string;
    at: string;
    action: string;
    entityType: string;
    userId: string | null;
    encounterId: string | null;
  }>;
}> {
  const qs = new URLSearchParams();
  if (params?.facet) qs.set("facet", params.facet);
  if (params?.q) qs.set("q", params.q);
  if (params?.encounterId) qs.set("encounterId", params.encounterId);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch(`${BASE}/audit-center${suffix}`);
}

export async function fetchChartAccess(encounterId?: string) {
  const qs = encounterId ? `?encounterId=${encodeURIComponent(encounterId)}` : "";
  return apiFetch(`${BASE}/chart-access${qs}`);
}

export async function recordChartAccess(body: {
  encounterId: string;
  accessKind: ChartAccessKind;
  reason?: string;
  sessionId?: string;
}) {
  return apiFetch(`${BASE}/chart-access`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchMedicationCompliance() {
  return apiFetch(`${BASE}/medication-compliance`);
}

export async function fetchDocumentationCompliance() {
  return apiFetch(`${BASE}/documentation-compliance`);
}
