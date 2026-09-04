import { resolveProductUiLanguageOrDefault } from "@/i18n/config";

/** Live chart-export HTML href using the active product UI locale. */
export function encounterChartExportHtmlHref(
  encounterId: string,
  language: string | null | undefined
): string {
  const locale = resolveProductUiLanguageOrDefault(language);
  return `/api/backend/encounters/${encodeURIComponent(encounterId)}/chart-export?format=html&locale=${encodeURIComponent(locale)}`;
}

/** Immutable snapshot HTML href; chrome re-renders with the active product UI locale. */
export function encounterChartExportSnapshotHtmlHref(
  encounterId: string,
  snapshotId: string,
  language: string | null | undefined
): string {
  const locale = resolveProductUiLanguageOrDefault(language);
  return `/api/backend/encounters/${encodeURIComponent(encounterId)}/chart-export/snapshots/${encodeURIComponent(snapshotId)}?format=html&locale=${encodeURIComponent(locale)}`;
}

export function roiSnapshotDocumentHtmlHref(
  roiRequestId: string,
  language: string | null | undefined
): string {
  const locale = resolveProductUiLanguageOrDefault(language);
  return `/api/backend/roi-requests/${encodeURIComponent(roiRequestId)}/snapshot-document?format=html&locale=${encodeURIComponent(locale)}`;
}
