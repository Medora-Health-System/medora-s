/**
 * French UI labels for order/order-item status (backend enums unchanged).
 * Worklists and department UIs use {@link getOrderItemStatusLabel}.
 * Chart / dossier patient use {@link getOrderItemChartLabel} so terminal workflow
 * states always collapse to « Terminée » without duplicating logic in each screen.
 */
export const ORDER_ITEM_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  ACKNOWLEDGED: "Reçu",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
  RESULTED: "Terminée",
  VERIFIED: "Terminée",
};

/** COMPLETED / RESULTED / VERIFIED — chart copy only; backend enums unchanged. */
export function isOrderItemDoneForChart(status: string | null | undefined): boolean {
  if (!status) return false;
  return status === "COMPLETED" || status === "RESULTED" || status === "VERIFIED";
}

export function getOrderItemStatusLabel(status: string): string {
  return ORDER_ITEM_STATUS_LABELS[status] ?? "—";
}

/**
 * Dossier patient / timeline / impression : garantit « Terminée » pour les états
 * terminaux même si la table de libellés évolue.
 */
export function getOrderItemChartLabel(status: string): string {
  if (isOrderItemDoneForChart(status)) {
    return ORDER_ITEM_STATUS_LABELS.COMPLETED;
  }
  return getOrderItemStatusLabel(status);
}
