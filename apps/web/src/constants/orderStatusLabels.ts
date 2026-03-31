/**
 * French UI labels for order/order-item status (backend enums unchanged).
 * Used on encounter orders tab, pharmacy worklist, and pharmacy page.
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

export function getOrderItemStatusLabel(status: string): string {
  return ORDER_ITEM_STATUS_LABELS[status] ?? "—";
}
