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
/** Route snapshot for IVPB detection (order line `route` or catalog medication route). */
export function medicationRouteSnapshotForInfusionCheck(item: Record<string, unknown>): string {
  const catalogMedication = item.catalogMedication;
  const catalogRoute =
    catalogMedication && typeof catalogMedication === "object"
      ? String((catalogMedication as Record<string, unknown>).route ?? "").trim()
      : "";
  const direct = typeof item.route === "string" ? item.route.trim() : "";
  return direct || catalogRoute;
}

export type MedicationInfusionActiveUi = {
  infusionSessionKey: string;
  /** From OrderEvent.metadata.infusionStartedAt (ISO) when backend sent it. */
  infusionStartedAtIso: string | null;
};

function parseMedicationInfusionOrderEventMetadata(metadata: unknown): {
  infusionScope?: string;
  infusionAction?: string;
  orderItemId?: string;
  infusionSessionKey?: string;
  infusionStartedAt?: string;
} | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const m = metadata as Record<string, unknown>;
  if (m.infusionScope !== "MEDICATION_INFUSION") return null;
  return {
    infusionScope: String(m.infusionScope),
    infusionAction: typeof m.infusionAction === "string" ? m.infusionAction : undefined,
    orderItemId: typeof m.orderItemId === "string" ? m.orderItemId : undefined,
    infusionSessionKey: typeof m.infusionSessionKey === "string" ? m.infusionSessionKey : undefined,
    infusionStartedAt: typeof m.infusionStartedAt === "string" ? m.infusionStartedAt : undefined,
  };
}

/**
 * Replays infusion-tagged order events for one order line (same rules as API infusion session).
 * `events` should be sorted ascending by `performedAt` for deterministic results (caller may pass unsorted).
 */
export function findActiveMedicationInfusionFromOrderEvents(
  events: ReadonlyArray<{ orderId: string; eventType: string; performedAt: string; metadata?: unknown }>,
  orderId: string,
  orderItemId: string
): MedicationInfusionActiveUi | null {
  const sorted = [...events].sort(
    (a, b) => new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime()
  );
  let active: MedicationInfusionActiveUi | null = null;
  for (const ev of sorted) {
    if (ev.orderId !== orderId) continue;
    const m = parseMedicationInfusionOrderEventMetadata(ev.metadata);
    if (!m || m.orderItemId !== orderItemId) continue;
    if (m.infusionAction === "START" && ev.eventType === "STARTED" && m.infusionSessionKey) {
      const iso =
        typeof m.infusionStartedAt === "string" && m.infusionStartedAt.trim()
          ? m.infusionStartedAt.trim()
          : null;
      active = {
        infusionSessionKey: m.infusionSessionKey,
        infusionStartedAtIso: iso,
      };
    } else if (
      m.infusionAction === "STOP" &&
      ev.eventType === "COMPLETED" &&
      m.infusionSessionKey &&
      active?.infusionSessionKey === m.infusionSessionKey
    ) {
      active = null;
    }
  }
  return active;
}

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
