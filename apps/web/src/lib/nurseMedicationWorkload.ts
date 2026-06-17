import {
  shouldSkipOrderLineCompletionForMar,
} from "@medora/shared";

/**
 * RN medication line workload — MAR-eligible MEDICATION lines (any fulfillment intent)
 * that are not yet terminal on the order line. MAR links lifecycle to `OrderItem.status`.
 *
 * Repeating PRN / ON_DEMAND lines remain actionable even when a prior MAR incorrectly
 * marked the line COMPLETED (MEDUI.ED.MAR.H2).
 */
export function isOrderItemPendingNurseMedication(it: {
  catalogItemType?: string | null;
  medicationFulfillmentIntent?: string | null;
  status?: string | null;
  frequencyCode?: string | null;
  notes?: string | null;
  route?: string | null;
}): boolean {
  if (it.catalogItemType !== "MEDICATION") return false;
  if (it.status === "CANCELLED") return false;
  if (it.status !== "COMPLETED") return true;

  return shouldSkipOrderLineCompletionForMar({
    frequencyCode: it.frequencyCode,
    directionsSig: it.notes,
    orderRoute: it.route,
    doseGatedMarPathUsed: false,
  });
}

/** Count pending RN medication lines across encounter orders (same API shape as GET /encounters/:id/orders). */
export function countPendingNurseMedicationLines(orders: unknown[]): number {
  if (!Array.isArray(orders)) return 0;
  let n = 0;
  for (const order of orders) {
    if ((order as { status?: string }).status === "CANCELLED") continue;
    const items = (order as { items?: unknown[] }).items;
    if (!Array.isArray(items)) continue;
    for (const it of items) {
      if (isOrderItemPendingNurseMedication(it as Parameters<typeof isOrderItemPendingNurseMedication>[0])) {
        n += 1;
      }
    }
  }
  return n;
}
