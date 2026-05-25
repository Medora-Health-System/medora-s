/**
 * Locale-aware UI labels for order/order-item status (backend enums unchanged).
 * Worklists and department UIs use {@link getOrderItemStatusLabel}.
 * Chart / dossier patient use {@link getOrderItemChartLabel} so terminal workflow
 * states always collapse to the completed label without duplicating logic per screen.
 */
import type { SupportedLanguage } from "@/i18n/config";
import { i18nMessage } from "@/lib/i18nMessagesLookup";

const ORDER_ITEM_STATUS_I18N_KEYS: Record<string, string> = {
  PENDING: "orderItemStatus.PENDING",
  ACKNOWLEDGED: "orderItemStatus.ACKNOWLEDGED",
  IN_PROGRESS: "orderItemStatus.IN_PROGRESS",
  COMPLETED: "orderItemStatus.COMPLETED",
  CANCELLED: "orderItemStatus.CANCELLED",
  RESULTED: "orderItemStatus.RESULTED",
  VERIFIED: "orderItemStatus.VERIFIED",
};

/** COMPLETED / RESULTED / VERIFIED — chart copy only; backend enums unchanged. */
export function isOrderItemDoneForChart(status: string | null | undefined): boolean {
  if (!status) return false;
  return status === "COMPLETED" || status === "RESULTED" || status === "VERIFIED";
}

export function getOrderItemStatusLabel(status: string, language: SupportedLanguage): string {
  const key = ORDER_ITEM_STATUS_I18N_KEYS[status];
  if (key) {
    const msg = i18nMessage(language, key);
    if (msg !== key) return msg;
  }
  return status || "—";
}

export function getOrderItemChartLabel(status: string, language: SupportedLanguage): string {
  if (isOrderItemDoneForChart(status)) {
    return i18nMessage(language, "orderItemStatus.COMPLETED");
  }
  return getOrderItemStatusLabel(status, language);
}
