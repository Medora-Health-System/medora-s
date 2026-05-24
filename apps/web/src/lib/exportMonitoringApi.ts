/**
 * Admin export monitoring (S20+) — GET/POST `/api/admin/export-monitoring*`.
 */

import { normalizeUserFacingError } from "./userFacingError";
import { parseApiResponse } from "./apiClient";

const ADMIN_API_BASE = "/api/admin";

export type ExportMonitoringFilter = "all" | "billing" | "ed_reports" | "failures";

export type ExportMonitoringRecentRow = {
  id: string;
  createdAt: string;
  exportType: string;
  status: string;
  source: string;
  from: string | null;
  to: string | null;
  format: string | null;
  rowCount: number | null;
  reportType: string | null;
  facilityId: string | null;
  actorName: string;
  retryable: boolean;
  downloadUrl: string | null;
};

export type ExportMonitoringPayload = {
  recentExports: ExportMonitoringRecentRow[];
  summary: {
    lastExternalBillingExportAt: string | null;
    lastEdReportExportAt: string | null;
    failedExportsLast48h: number;
    autoExportEnabled: boolean;
    vendorWebhookConfigured: boolean;
  };
};

export async function fetchExportMonitoring(
  facilityId: string,
  filter: ExportMonitoringFilter = "all"
): Promise<ExportMonitoringPayload> {
  const q = filter === "all" ? "" : `?filter=${encodeURIComponent(filter)}`;
  const res = await fetch(`${ADMIN_API_BASE}/export-monitoring${q}`, {
    method: "GET",
    credentials: "include",
    headers: { "x-facility-id": facilityId },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(normalizeUserFacingError(txt || `HTTP ${res.status}`, "fr") || `HTTP ${res.status}`);
  }
  return (await parseApiResponse(res)) as ExportMonitoringPayload;
}

export async function postExportMonitoringRetry(
  facilityId: string,
  body: { exportType: "external_billing_daily"; date: string; format: "json" | "csv" }
): Promise<{ automationBatchId: string }> {
  const res = await fetch(`${ADMIN_API_BASE}/export-monitoring/retry`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "x-facility-id": facilityId },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(normalizeUserFacingError(txt || `HTTP ${res.status}`, "fr") || `HTTP ${res.status}`);
  }
  return (await parseApiResponse(res)) as { automationBatchId: string };
}
