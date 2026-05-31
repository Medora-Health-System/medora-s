/**
 * ED trackboard — aggregate open order line count (no order detail / PHI).
 * Aligns with ER dashboard open-line rules (`isOrderItemActiveForErDashboard`).
 */

const TERMINAL_ORDER_ITEM_STATUSES = new Set(["COMPLETED", "RESULTED", "VERIFIED", "CANCELLED"]);
const TERMINAL_LIFECYCLE_STATES = new Set(["COMPLETED", "REVIEWED", "CANCELLED"]);

export function isTrackboardOpenOrderItem(args: {
  itemStatus: string | null | undefined;
  lifecycleState?: string | null | undefined;
  parentOrderStatus?: string | null | undefined;
}): boolean {
  const parent = String(args.parentOrderStatus ?? "").trim().toUpperCase();
  if (parent === "CANCELLED") return false;

  const st = String(args.itemStatus ?? "").trim().toUpperCase();
  if (!st || st === "CANCELLED" || TERMINAL_ORDER_ITEM_STATUSES.has(st)) return false;

  const ls = String(args.lifecycleState ?? "").trim().toUpperCase();
  if (ls && TERMINAL_LIFECYCLE_STATES.has(ls)) return false;

  return true;
}

/** Count actionable open order lines for trackboard badge display. */
export function countTrackboardOpenOrderItems(
  orders: ReadonlyArray<{
    status?: string | null;
    items?: ReadonlyArray<{ status?: string | null; lifecycleState?: string | null }> | null;
  }>
): number {
  let count = 0;
  for (const order of orders) {
    const parentStatus = order.status;
    const items = Array.isArray(order.items) ? order.items : [];
    for (const item of items) {
      if (
        isTrackboardOpenOrderItem({
          itemStatus: item.status,
          lifecycleState: item.lifecycleState,
          parentOrderStatus: parentStatus,
        })
      ) {
        count += 1;
      }
    }
  }
  return count;
}
