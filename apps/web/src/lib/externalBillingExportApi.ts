import { apiFetch, apiFetchResponse } from "./apiClient";
import type { ExternalBillingExportCertificationSummary } from "@medora/shared";
import {
  buildExternalBillingDailyCertificationPath,
  buildExternalBillingDailyCertifiedExportPath,
  buildExternalBillingDailyExportPath,
  buildExternalBillingEncounterExportPath,
  buildExternalBillingWeeklyCertificationPath,
  buildExternalBillingWeeklyCertifiedExportPath,
  filenameFromContentDisposition,
  sanitizeFilenameSegment,
} from "./externalBillingExportDownload.util";

export {
  buildExternalBillingDailyExportPath,
  buildExternalBillingEncounterExportPath,
  buildExternalBillingDailyCertifiedExportPath,
  buildExternalBillingWeeklyCertifiedExportPath,
  filenameFromContentDisposition,
} from "./externalBillingExportDownload.util";

function triggerBrowserFileDownload(blob: Blob, filename: string): void {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadExternalBillingEncounterExport(
  facilityId: string,
  encounterId: string,
  format: "json" | "csv"
): Promise<void> {
  const path = buildExternalBillingEncounterExportPath(encounterId, format);
  const res = await apiFetchResponse(path, { facilityId, method: "GET" });
  const blob = await res.blob();
  const cd = res.headers.get("content-disposition");
  const safeId = sanitizeFilenameSegment(encounterId);
  const fallback =
    format === "csv" ? `external-billing-${safeId}.csv` : `external-billing-${safeId}.json`;
  triggerBrowserFileDownload(blob, filenameFromContentDisposition(cd, fallback));
}

/** Downloads certified daily bundle (closed encounters on UTC calendar day). */
export async function downloadExternalBillingDailyExport(
  facilityId: string,
  date: string,
  format: "json" | "csv"
): Promise<void> {
  const path = buildExternalBillingDailyCertifiedExportPath(date, format);
  const res = await apiFetchResponse(path, { facilityId, method: "GET" });
  const blob = await res.blob();
  const cd = res.headers.get("content-disposition");
  const safeDate = sanitizeFilenameSegment(date);
  const fallback =
    format === "csv"
      ? `external-billing-daily-${safeDate}.csv`
      : `external-billing-daily-${safeDate}.json`;
  triggerBrowserFileDownload(blob, filenameFromContentDisposition(cd, fallback));
}

export async function downloadExternalBillingWeeklyExport(
  facilityId: string,
  weekStart: string,
  format: "json" | "csv"
): Promise<void> {
  const path = buildExternalBillingWeeklyCertifiedExportPath(weekStart, format);
  const res = await apiFetchResponse(path, { facilityId, method: "GET" });
  const blob = await res.blob();
  const cd = res.headers.get("content-disposition");
  const safeWeek = sanitizeFilenameSegment(weekStart);
  const fallback =
    format === "csv"
      ? `external-billing-weekly-${safeWeek}.csv`
      : `external-billing-weekly-${safeWeek}.json`;
  triggerBrowserFileDownload(blob, filenameFromContentDisposition(cd, fallback));
}

export async function fetchExternalBillingDailyCertification(
  facilityId: string,
  date: string
): Promise<ExternalBillingExportCertificationSummary> {
  return apiFetch(buildExternalBillingDailyCertificationPath(date), { facilityId }) as Promise<
    ExternalBillingExportCertificationSummary
  >;
}

export async function fetchExternalBillingWeeklyCertification(
  facilityId: string,
  weekStart: string
): Promise<ExternalBillingExportCertificationSummary> {
  return apiFetch(buildExternalBillingWeeklyCertificationPath(weekStart), { facilityId }) as Promise<
    ExternalBillingExportCertificationSummary
  >;
}
