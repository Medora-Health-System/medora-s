import type { SupportedLanguage } from "@/i18n/config";
import type { ChartSummaryOrderItem } from "@/lib/chartApi";
import { isInvalidTechnicalOrderDisplayLabel } from "@medora/shared";

function chartOrderTypeFallbackEn(catalogItemType: string, t: (key: string) => string): string {
  const c = catalogItemType.trim();
  if (c === "LAB_TEST") return t("patientChartUi.orderDisplayFallback.labTest");
  if (c === "IMAGING_STUDY") return t("patientChartUi.orderDisplayFallback.imaging");
  if (c === "MEDICATION") return t("patientChartUi.orderDisplayFallback.medication");
  if (c === "CARE") return t("patientChartUi.orderDisplayFallback.care");
  if (c === "SUPPLY") return t("patientChartUi.orderDisplayFallback.supply");
  return t("common.dash");
}

/**
 * Order line title for patient chart (API sends `displayLabelFr` + `displayLabelEn`).
 * EN: strict — `displayLabelEn` only when valid; never legacy `displayLabel` / `displayLabelFr`.
 * If `displayLabelEn` is missing/invalid, use typed EN fallback (needs `t`).
 */
export function chartSummaryOrderItemLineLabel(
  it: ChartSummaryOrderItem,
  language: SupportedLanguage,
  t?: (key: string) => string
): string {
  const cat = String(it.catalogItemType ?? "CARE");
  if (language === "fr") {
    const fr = (it.displayLabelFr ?? it.displayLabel)?.trim();
    if (fr && !isInvalidTechnicalOrderDisplayLabel(fr, cat)) return fr;
    const en = (it.displayLabelEn ?? "").trim();
    if (en && !isInvalidTechnicalOrderDisplayLabel(en, cat)) return en;
    return "—";
  }
  const enOnly = it.displayLabelEn?.trim();
  if (enOnly && !isInvalidTechnicalOrderDisplayLabel(enOnly, cat)) return enOnly;
  if (t) return chartOrderTypeFallbackEn(cat, t);
  return "—";
}

export function chartSummaryAttachmentSummary(
  result: ChartSummaryOrderItem["result"],
  language: SupportedLanguage
): string | null {
  if (!result) return null;
  if (language === "fr") {
    return result.attachmentSummaryFr?.trim() || null;
  }
  return result.attachmentSummaryEn?.trim() || null;
}
