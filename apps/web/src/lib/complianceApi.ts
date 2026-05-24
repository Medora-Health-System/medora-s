/**
 * S24E — GET `/api/admin/compliance` (Nest, MEDORA_SUPER_ADMIN).
 */

import { normalizeUserFacingError } from "./userFacingError";
import { parseApiResponse } from "./apiClient";

const ADMIN_API_BASE = "/api/admin";

export type ComplianceCoverageSlice = {
  total: number;
  audited: number;
  percent: number;
};

export type ComplianceDashboardPayload = {
  window: { from: string; to: string };
  auditCoverage: {
    orders: ComplianceCoverageSlice;
    mar: ComplianceCoverageSlice;
    exports: ComplianceCoverageSlice;
  };
  gaps: {
    ordersMissingAudit: number;
    marMissingAudit: number;
    exportsMissingAudit: number;
  };
  riskSignals: {
    overrideCount: number;
    failedExportCount: number;
    failedExportRate: number;
    criticalAuditCount: number;
  };
};

export async function fetchComplianceDashboard(facilityId: string): Promise<ComplianceDashboardPayload> {
  const res = await fetch(`${ADMIN_API_BASE}/compliance`, {
    method: "GET",
    credentials: "include",
    headers: { "x-facility-id": facilityId },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(normalizeUserFacingError(txt || `HTTP ${res.status}`, "fr") || `HTTP ${res.status}`);
  }
  return (await parseApiResponse(res)) as ComplianceDashboardPayload;
}
