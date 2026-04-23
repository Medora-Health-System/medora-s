import type { SupportedLanguage } from "@/i18n/config";
import type { ChartSummaryOrderItem } from "@/lib/chartApi";

/**
 * Order line title for patient chart (API sends FR + EN catalog resolution).
 */
export function chartSummaryOrderItemLineLabel(
  it: ChartSummaryOrderItem,
  language: SupportedLanguage
): string {
  if (language === "fr") {
    const fr = (it.displayLabelFr ?? it.displayLabel)?.trim();
    if (fr) return fr;
    return (it.displayLabelEn ?? "").trim() || "—";
  }
  const en = (it.displayLabelEn ?? it.displayLabel)?.trim();
  if (en) return en;
  return (it.displayLabelFr ?? "").trim() || "—";
}

export function chartSummaryAttachmentSummary(
  result: ChartSummaryOrderItem["result"],
  language: SupportedLanguage
): string | null {
  if (!result) return null;
  if (language === "fr") {
    return result.attachmentSummaryFr?.trim() || null;
  }
  return result.attachmentSummaryEn?.trim() || result.attachmentSummaryFr?.trim() || null;
}
