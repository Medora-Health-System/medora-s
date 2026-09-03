import { parseProductUiLanguage, type SupportedLanguage } from "@/i18n/config";
import type { ChartSummaryOrderItem } from "@/lib/chartApi";
import {
  isIncompleteMedicationOrderDisplayLabel,
  isInvalidTechnicalOrderDisplayLabel,
  isOrderDisplayLabelUnavailable,
} from "@medora/shared";

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
  language: SupportedLanguage | string,
  t?: (key: string) => string
): string {
  const cat = String(it.catalogItemType ?? "CARE");
  const incompleteOpts =
    cat === "MEDICATION"
      ? {
          catalogItemType: cat,
          strengthCandidates: [
            (it.displayLabelEn ?? "").trim(),
            (it.displayLabelFr ?? "").trim(),
          ],
        }
      : { catalogItemType: cat };

  const parsed = parseProductUiLanguage(language);
  if (parsed === "fr") {
    const fr = it.displayLabelFr?.trim();
    if (
      fr &&
      !isIncompleteMedicationOrderDisplayLabel(fr, incompleteOpts) &&
      !isInvalidTechnicalOrderDisplayLabel(fr, cat)
    ) {
      return fr;
    }
    return "—";
  }
  if (parsed !== "en" && language != null && String(language).trim() !== "") {
    return "—";
  }
  const enOnly = it.displayLabelEn?.trim();
  if (
    enOnly &&
    !isIncompleteMedicationOrderDisplayLabel(enOnly, incompleteOpts) &&
    !isInvalidTechnicalOrderDisplayLabel(enOnly, cat)
  ) {
    return enOnly;
  }
  if (t) return chartOrderTypeFallbackEn(cat, t);
  return "—";
}

export function chartSummaryAttachmentSummary(
  result: ChartSummaryOrderItem["result"],
  language: SupportedLanguage | string
): string | null {
  if (!result) return null;
  const parsed = parseProductUiLanguage(language);
  if (parsed === "fr") return result.attachmentSummaryFr?.trim() || null;
  if (parsed === "en") return result.attachmentSummaryEn?.trim() || null;
  return null;
}
