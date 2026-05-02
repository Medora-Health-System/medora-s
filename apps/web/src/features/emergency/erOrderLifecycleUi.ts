/**
 * ER order dashboard — item-level lifecycle truth aligned with Prisma `OrderItem.status`
 * (parent `Order.status` may remain PLACED while lines complete).
 *
 * Completed/cancelled **titles** in the ER orders card use API `lineLabelEn` / `lineLabelFr`
 * from `GET /encounters/:id/order-events` (catalog-resolved); open-line labels use encounter orders enrichment.
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

/** True when this line may be cancelled individually (ER × button). */
export function isOrderItemCancellableLineForEr(item: Record<string, unknown>): boolean {
  const ls = String(item.lifecycleState ?? "");
  if (ls === "REVIEWED" || ls === "CANCELLED") return false;
  return isOrderItemActiveForErDashboard(item);
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
  const m = metadata as { orderItemId?: unknown; order_item_id?: unknown };
  const camel = m.orderItemId;
  const snake = m.order_item_id;
  if (typeof camel === "string" && camel.length > 0) return camel;
  if (typeof snake === "string" && snake.length > 0) return snake;
  return null;
}

/**
 * When an order is cancelled, some lines keep a terminal status (e.g. RESULTED) while others become
 * `CANCELLED`. Drop synthetic “completed” stream rows for lines that are explicitly cancelled so
 * the same line is not implied as both completed and cancelled.
 */
export function shouldIncludeCompletedOrderEventInErMerge(
  event: { orderId: string; metadata?: unknown },
  orders: Array<{ id: string; items: unknown[] }>
): boolean {
  const meta = event.metadata;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const m = meta as Record<string, unknown>;
    if (typeof m.medicationAdministrationId === "string" && m.medicationAdministrationId.length > 0) {
      return true;
    }
  }
  const itemId = orderItemIdFromEventMetadata(meta);
  if (!itemId) return true;
  const order = orders.find((o) => o.id === event.orderId);
  if (!order) return true;
  const items = Array.isArray(order.items) ? order.items : [];
  const row = items.find((it) => String((it as Record<string, unknown>).id ?? "") === itemId) as
    | Record<string, unknown>
    | undefined;
  if (!row) return true;
  if (orderItemStatus(row) === CANCELLED_STATUS) return false;
  return true;
}
