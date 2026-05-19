/**
 * Phase 19C.4 — read-only medication governance dashboard (`/api/backend/medication-master/governance/*`).
 */

import { parseApiResponse } from "./apiClient";
import { normalizeUserFacingError } from "./userFacingError";

const API_BASE = "/api/backend/medication-master/governance";

export type MedicationGovernanceSummary = {
  readOnly: true;
  facilityId: string | null;
  generatedAt: string;
  promotion: {
    activeConcepts: number;
    activeProducts: number;
    activePackages: number;
    stagingByOverallStatus: Record<string, number>;
    stagingByImportGateStatus: Record<string, number>;
    latestBatchId: string | null;
    promotedStagingRows: number;
    pendingStagingRows: number;
  };
  readiness: {
    conceptsReadyPercent: number;
    packagesWithNdcPercent: number;
    packagesOnFormularyPercent: number;
    legacyCatalogMappedPercent: number;
  };
  counts: {
    missingNdc: number;
    missingBillingProfile: number;
    missingSafetyProfile: number;
    missingInfusionProfile: number;
    duplicateNdcGroups: number;
    highAlertConcepts: number;
    controlledConcepts: number;
    edFormularyPackages: number;
    packagesMissingFormulary: number;
    infusionCapableProducts: number;
    legacyCatalogActive: number;
    legacyCatalogMapped: number;
    legacyCatalogUnmapped: number;
  };
  warningCountsByCode: Record<string, number>;
  warningCountsBySeverity: Record<string, number>;
  activation: {
    byStatus: Record<string, number>;
    activationApproved: number;
    blocked: number;
    retired: number;
    pendingReview: number;
    readyForActivation: number;
  };
};

export type MedicationGovernanceWarningRow = {
  code: string;
  severity: "critical" | "warning" | "info";
  scope: "concept" | "product" | "package";
  scopeLabel: string;
  conceptId: string;
  conceptCode: string;
  displayName: string;
  genericName: string;
};

export type MedicationGovernanceUnmappedRow = {
  catalogMedicationId: string;
  catalogCode: string;
  name: string;
  genericName: string | null;
  strength: string | null;
  dosageForm: string | null;
  route: string | null;
  ndc11: string | null;
  matchConfidence: "UNMAPPED";
};

export type MedicationGovernanceDuplicateGroup = {
  kind: "ndc11" | "genericName" | "strengthDisplay" | "stagingCode";
  matchKey: string;
  severity: "critical" | "warning" | "info";
  entries: Array<{
    conceptId?: string;
    productId?: string;
    packageId?: string;
    catalogMedicationId?: string;
    stagingRowId?: string;
    code: string;
    label: string;
  }>;
};

async function governanceFetch<T>(path: string, facilityId: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    credentials: "include",
    headers: { "x-facility-id": facilityId },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(normalizeUserFacingError(txt || `HTTP ${res.status}`) || `HTTP ${res.status}`);
  }
  return (await parseApiResponse(res)) as T;
}

function facilityQs(facilityId: string, extra?: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams({ facilityId });
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined && v !== "") sp.set(k, String(v));
    }
  }
  return `?${sp.toString()}`;
}

export async function fetchMedicationGovernanceSummary(
  facilityId: string
): Promise<MedicationGovernanceSummary> {
  return governanceFetch(`/summary${facilityQs(facilityId)}`, facilityId);
}

export async function fetchMedicationGovernanceWarnings(
  facilityId: string,
  params?: { code?: string; severity?: string; limit?: number; offset?: number }
): Promise<{ items: MedicationGovernanceWarningRow[]; total: number }> {
  return governanceFetch(
    `/warnings${facilityQs(facilityId, {
      code: params?.code,
      severity: params?.severity,
      limit: params?.limit ?? 200,
      offset: params?.offset ?? 0,
    })}`,
    facilityId
  );
}

export async function fetchMedicationGovernanceUnmapped(
  facilityId: string,
  params?: { q?: string; limit?: number; offset?: number }
): Promise<{ items: MedicationGovernanceUnmappedRow[]; total: number }> {
  return governanceFetch(
    `/unmapped${facilityQs(facilityId, {
      q: params?.q,
      limit: params?.limit ?? 200,
      offset: params?.offset ?? 0,
    })}`,
    facilityId
  );
}

export async function fetchMedicationGovernanceDuplicates(
  facilityId: string,
  params?: { kind?: string; limit?: number; offset?: number }
): Promise<{ items: MedicationGovernanceDuplicateGroup[]; total: number }> {
  return governanceFetch(
    `/duplicate-groups${facilityQs(facilityId, {
      kind: params?.kind,
      limit: params?.limit ?? 100,
      offset: params?.offset ?? 0,
    })}`,
    facilityId
  );
}
