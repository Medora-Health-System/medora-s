/**
 * French UI labels for order/order-item status (backend enums unchanged).
 * Used on encounter orders tab, pharmacy worklist, and pharmacy page.
 */
export const ORDER_ITEM_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  PLACED: "Envoyée",
  SIGNED: "Signée",
  ACKNOWLEDGED: "Reçue",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
  RESULTED: "Résultat disponible",
  VERIFIED: "Vérifiée",
};

export function getOrderItemStatusLabel(status: string): string {
  return ORDER_ITEM_STATUS_LABELS[status] ?? "—";
}
