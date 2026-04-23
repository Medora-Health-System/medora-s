/**
 * RN medication line workload — MAR-eligible MEDICATION lines (any fulfillment intent)
 * that are not yet terminal on the order line. MAR links lifecycle to `OrderItem.status`.
 */
export function isOrderItemPendingNurseMedication(it: {
  catalogItemType?: string | null;
  medicationFulfillmentIntent?: string | null;
  status?: string | null;
}): boolean {
  return (
    it.catalogItemType === "MEDICATION" &&
    it.status !== "COMPLETED" &&
    it.status !== "CANCELLED"
  );
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
