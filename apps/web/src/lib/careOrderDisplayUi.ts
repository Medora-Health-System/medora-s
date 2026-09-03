import { resolveProductUiLanguageOrDefault, type SupportedLanguage } from "@/i18n/config";
import {
  resolveCareOrderItemClinicalDisplay,
  sanitizeOrderItemNotesForDisplay,
  type OrderItemLabelInput,
} from "@medora/shared";

export function careOrderItemLabelInput(item: {
  catalogItemType?: string | null;
  enterpriseProcedureId?: string | null;
  manualLabel?: string | null;
  notes?: string | null;
}): OrderItemLabelInput {
  return {
    catalogItemType: String(item.catalogItemType ?? "CARE"),
    enterpriseProcedureId: item.enterpriseProcedureId,
    manualLabel: item.manualLabel,
    notes: item.notes,
  };
}

export function careOrderClinicalDetailLines(
  item: Parameters<typeof careOrderItemLabelInput>[0],
  language: SupportedLanguage
): string[] {
    const locale = resolveProductUiLanguageOrDefault(language);
  const display = resolveCareOrderItemClinicalDisplay(careOrderItemLabelInput(item), locale);
  if (display?.detailLines.length) return display.detailLines;
  const cleaned = sanitizeOrderItemNotesForDisplay(careOrderItemLabelInput(item));
  return cleaned ? [cleaned] : [];
}
