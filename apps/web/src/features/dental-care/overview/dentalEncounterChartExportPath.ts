import { resolveProductUiLanguageOrDefault } from "@/i18n/config";

/**
 * MEDUI.ES.1J.B — dental workspace chart-export URL uses the active product UI locale.
 * Hidden `es` is internally valid. Patient language preference is never the export locale.
 */
export function dentalEncounterChartExportHtmlPath(
  encounterId: string,
  language: string | null | undefined
): string {
  const locale = resolveProductUiLanguageOrDefault(language);
  return `/encounters/${encodeURIComponent(encounterId)}/chart-export?format=html&locale=${encodeURIComponent(locale)}`;
}
