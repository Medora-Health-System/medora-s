/**
 * ER order dashboard — item-level lifecycle truth aligned with Prisma `OrderItem.status`
 * (parent `Order.status` may remain PLACED while lines complete).
 */

const TERMINAL_DONE_STATUSES = new Set(["COMPLETED", "RESULTED", "VERIFIED"]);
const CANCELLED_STATUS = "CANCELLED";

export function orderItemStatus(item: Record<string, unknown>): string {
  return String(item.status ?? "");
}

/** Line still counts as active in ER summary / open lists. */
export function isOrderItemActiveForErDashboard(item: Record<string, unknown>): boolean {
  const st = orderItemStatus(item);
  if (st === CANCELLED_STATUS) return false;
  if (TERMINAL_DONE_STATUSES.has(st)) return false;
  return true;
}

/** Line counts as clinically completed for the Completed section (not cancelled). */
export function isOrderItemCompletedForErDashboard(item: Record<string, unknown>): boolean {
  const st = orderItemStatus(item);
  if (st === CANCELLED_STATUS) return false;
  return TERMINAL_DONE_STATUSES.has(st);
}

export function isParentOrderCancelled(order: Record<string, unknown>): boolean {
  return String(order.status ?? "") === CANCELLED_STATUS;
}

export function orderHasAnyActiveItemForEr(order: { items: unknown[] }): boolean {
  if (isParentOrderCancelled(order as Record<string, unknown>)) return false;
  const items = Array.isArray(order.items) ? order.items : [];
  return items.some((it) => isOrderItemActiveForErDashboard(it as Record<string, unknown>));
}

export function orderItemIdFromEventMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const id = (metadata as { orderItemId?: unknown }).orderItemId;
  return typeof id === "string" && id.length > 0 ? id : null;
}
