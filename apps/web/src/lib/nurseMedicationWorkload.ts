/**
 * RN medication line workload — mirrors OrdersTab (encounters/[id]/page.tsx):
 * MEDICATION + ADMINISTER_CHART + not completed/cancelled.
 */
export function isOrderItemPendingNurseMedication(it: {
  catalogItemType?: string | null;
  medicationFulfillmentIntent?: string | null;
  status?: string | null;
}): boolean {
  return (
    it.catalogItemType === "MEDICATION" &&
    it.medicationFulfillmentIntent === "ADMINISTER_CHART" &&
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
