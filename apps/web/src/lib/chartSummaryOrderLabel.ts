import type { SupportedLanguage } from "@/i18n/config";
import type { ChartSummaryOrderItem } from "@/lib/chartApi";
import { isInvalidTechnicalOrderDisplayLabel } from "@medora/shared";

/**
 * Order line title for patient chart (API sends `displayLabelFr` + `displayLabelEn`).
 * EN UI uses only `displayLabelEn` — never `displayLabel` / `displayLabelFr`.
 */
export function chartSummaryOrderItemLineLabel(
  it: ChartSummaryOrderItem,
  language: SupportedLanguage
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
