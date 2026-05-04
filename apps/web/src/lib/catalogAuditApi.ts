/**
 * GET `/api/admin/catalog-audit` (Nest, platform operators).
 */

import { normalizeUserFacingError } from "./userFacingError";
import { parseApiResponse } from "./apiClient";

const ADMIN_API_BASE = "/api/admin";

export type AdminCatalogAuditSummary = {
  totalMedications: number;
  withAdministrationType: number;
  withBillingClass: number;
  unknownBillingClass: number;
  infusionCandidates: number;
  highRiskConflicts: number;
};

export type AdminCatalogAuditRow = {
  catalogMedicationId: string;
  label: string;
  route?: string | null;
  administrationType?: string | null;
  billingClass?: string | null;
  flags: string[];
  usageCount?: number;
};

export type AdminCatalogAuditPayload = {
  summary: AdminCatalogAuditSummary;
  rows: AdminCatalogAuditRow[];
};

export async function fetchCatalogAuditDashboard(facilityId: string): Promise<AdminCatalogAuditPayload> {
  const res = await fetch(`${ADMIN_API_BASE}/catalog-audit`, {
    method: "GET",
    credentials: "include",
    headers: { "x-facility-id": facilityId },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(normalizeUserFacingError(txt || `HTTP ${res.status}`) || `HTTP ${res.status}`);
  }
  return (await parseApiResponse(res)) as AdminCatalogAuditPayload;
}
