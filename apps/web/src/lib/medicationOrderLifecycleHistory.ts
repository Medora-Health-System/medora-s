export type MedicationOrderLifecycleHistoryRow = {
  id: string;
  eventType: string;
  performedAt: string;
  performedByDisplayName: string | null;
  note: string | null;
  reason: string | null;
};

const LIFECYCLE_EVENT_TYPES = new Set([
  "DISCONTINUED",
  "ON_HOLD",
  "RESUMED",
  "MODIFIED",
  "SUPERSEDED",
  "CREATED",
]);

function readStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function orderItemIdFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const row = metadata as { orderItemId?: unknown; order_item_id?: unknown };
  return readStr(row.orderItemId) || readStr(row.order_item_id) || null;
}

function reasonFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const row = metadata as { reason?: unknown; lifecycleReason?: unknown };
  return readStr(row.reason) || readStr(row.lifecycleReason) || null;
}

export function filterMedicationOrderLifecycleEventsForItem(
  orderEvents: unknown[],
  orderItemId: string,
  orderId: string
): MedicationOrderLifecycleHistoryRow[] {
  const targetItemId = orderItemId.trim();
  const targetOrderId = orderId.trim();
  if (!targetItemId || !targetOrderId) return [];

  const rows: MedicationOrderLifecycleHistoryRow[] = [];
  for (const raw of orderEvents) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const event = raw as Record<string, unknown>;
    if (readStr(event.orderId) !== targetOrderId) continue;
    const eventType = readStr(event.eventType).toUpperCase();
    if (!LIFECYCLE_EVENT_TYPES.has(eventType)) continue;
    const metaItemId = orderItemIdFromMetadata(event.metadata);
    if (metaItemId && metaItemId !== targetItemId) continue;
    const id = readStr(event.id);
    const performedAt = readStr(event.performedAt);
    if (!id || !performedAt) continue;
    rows.push({
      id,
      eventType,
      performedAt,
      performedByDisplayName: readStr(event.performedByDisplayName) || null,
      note: readStr(event.note) || null,
      reason: reasonFromMetadata(event.metadata),
    });
  }

  return rows.sort(
    (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
  );
}

export function medicationOrderLifecycleEventLabelKey(eventType: string): string {
  const normalized = eventType.trim().toUpperCase();
  switch (normalized) {
    case "DISCONTINUED":
      return "orderEvent.discontinued";
    case "ON_HOLD":
      return "orderEvent.onHold";
    case "RESUMED":
      return "orderEvent.resumed";
    case "MODIFIED":
      return "orderEvent.modified";
    case "SUPERSEDED":
      return "orderEvent.superseded";
    case "CREATED":
      return "orderEvent.created";
    default:
      return "orderEvent.completed";
  }
}
