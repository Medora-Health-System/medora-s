import { apiFetchResponse } from "./apiClient";
import {
  buildExternalBillingDailyExportPath,
  buildExternalBillingEncounterExportPath,
  filenameFromContentDisposition,
  sanitizeFilenameSegment,
} from "./externalBillingExportDownload.util";

export {
  buildExternalBillingDailyExportPath,
  buildExternalBillingEncounterExportPath,
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

/**
 * Downloads medora_external_billing_v1 package for one encounter (JSON or CSV).
 * Uses session cookies, `x-facility-id`, and the same 401 refresh behavior as `apiFetch`.
 */
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

/**
 * Downloads medora_external_billing_v1 daily bundle for the facility (closed encounters on UTC calendar day).
 */
export async function downloadExternalBillingDailyExport(
  facilityId: string,
  date: string,
  format: "json" | "csv"
): Promise<void> {
  const path = buildExternalBillingDailyExportPath(date, format);
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
