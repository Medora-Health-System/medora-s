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

/**
 * ER cancel × visibility — stricter than {@link isOrderItemCancellableLineForEr}:
 * ORDERED / ACKNOWLEDGED / PLACED|PENDING only; excludes IN_PROGRESS and terminal states.
 */
export function isOrderLineCancelableByStateForEr(item: Record<string, unknown>): boolean {
  const ls = String(item.lifecycleState ?? "").trim();
  const st = orderItemStatus(item);

  if (ls === "REVIEWED" || ls === "CANCELLED" || st === CANCELLED_STATUS) return false;
  if (TERMINAL_DONE_STATUSES.has(st)) return false;
  if (ls === "COMPLETED" || ls === "IN_PROGRESS") return false;

  if (ls === "ORDERED" || ls === "ACKNOWLEDGED") return true;

  if (!ls) {
    return st === "PLACED" || st === "PENDING" || st === "ACKNOWLEDGED";
  }

  return false;
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

/** Text used with `isMedicationInfusionCandidate` (catalog + manual labels + code). */
export function medicationInfusionClassificationText(item: Record<string, unknown>): string {
  const cat = item.catalogMedication;
  const c = cat && typeof cat === "object" ? (cat as Record<string, unknown>) : null;
  const strengthRaw = item.strength;
  const strengthStr =
    typeof strengthRaw === "string"
      ? strengthRaw.trim()
      : strengthRaw != null && String(strengthRaw).trim() !== ""
        ? String(strengthRaw).trim()
        : "";
  const parts = [
    item.manualLabel,
    item.manualSecondaryText,
    strengthStr,
    c?.displayNameEn,
    c?.name,
    c?.genericName,
    c?.code,
  ]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
  return parts.join(" ");
}

export type MedicationInfusionActiveUi = {
  infusionSessionKey: string;
  /** From OrderEvent.metadata.infusionStartedAt (ISO) when backend sent it. */
  infusionStartedAtIso: string | null;
  /** From order-events API enrichment when present. */
  startedByDisplayName?: string | null;
  /** From OrderEvent.metadata.performedByTitle when present. */
  startedByTitle?: string | null;
};

export type MedicationInfusionCompletedTimelineUi = {
  infusionSessionKey: string;
  infusionStartedAtIso: string | null;
  infusionStoppedAtIso: string | null;
  durationMinutes: number | null;
  startedByDisplayName: string | null;
  startedByTitle: string | null;
  stoppedByDisplayName: string | null;
  stoppedByTitle: string | null;
};

export type MedicationInfusionTimelineResult = {
  active: MedicationInfusionActiveUi | null;
  /** Most recent completed session for this line (START matched with STOP), if any. */
  lastCompleted: MedicationInfusionCompletedTimelineUi | null;
};

function parseMedicationInfusionOrderEventMetadata(metadata: unknown): {
  infusionScope?: string;
  infusionAction?: string;
  orderItemId?: string;
  infusionSessionKey?: string;
  infusionStartedAt?: string;
  infusionStoppedAt?: string;
  durationMinutes?: number;
} | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const m = metadata as Record<string, unknown>;
  if (m.infusionScope !== "MEDICATION_INFUSION") return null;
  const dmRaw = m.durationMinutes;
  let durationMinutes: number | undefined;
  if (typeof dmRaw === "number" && Number.isFinite(dmRaw)) durationMinutes = dmRaw;
  else if (typeof dmRaw === "string" && dmRaw.trim() !== "") {
    const n = Number(dmRaw);
    if (Number.isFinite(n)) durationMinutes = n;
  }
  return {
    infusionScope: String(m.infusionScope),
    infusionAction: typeof m.infusionAction === "string" ? m.infusionAction : undefined,
    orderItemId: typeof m.orderItemId === "string" ? m.orderItemId : undefined,
    infusionSessionKey: typeof m.infusionSessionKey === "string" ? m.infusionSessionKey : undefined,
    infusionStartedAt: typeof m.infusionStartedAt === "string" ? m.infusionStartedAt : undefined,
    infusionStoppedAt: typeof m.infusionStoppedAt === "string" ? m.infusionStoppedAt : undefined,
    durationMinutes,
  };
}

function readInfusionPerformerFromEvent(ev: {
  performedByDisplayName?: string | null;
  metadata?: unknown;
}): { display: string | null; title: string | null } {
  const meta =
    ev.metadata && typeof ev.metadata === "object" && !Array.isArray(ev.metadata)
      ? (ev.metadata as Record<string, unknown>)
      : null;
  const fromMetaDisplay =
    meta && typeof meta.performedByDisplayName === "string" && meta.performedByDisplayName.trim()
      ? meta.performedByDisplayName.trim()
      : null;
  const fromMetaTitle =
    meta && typeof meta.performedByTitle === "string" && meta.performedByTitle.trim()
      ? meta.performedByTitle.trim()
      : null;
  const fromEv =
    typeof ev.performedByDisplayName === "string" && ev.performedByDisplayName.trim()
      ? ev.performedByDisplayName.trim()
      : null;
  return {
    display: fromMetaDisplay || fromEv || null,
    title: fromMetaTitle || null,
  };
}

/** Elapsed since infusion start — plain segments for i18n templates ({h},{m},{s}). */
export function formatInfusionElapsedParts(elapsedMs: number): { h: number; m: number; s: number } {
  const ms = Math.max(0, elapsedMs);
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { h, m, s };
}

/** Builds the `{elapsed}` segment then applies `infusionTimeline.infusionElapsed`. */
/** H/M/S segment only (no outer “Elapsed” label). */
export function formatInfusionElapsedInnerOnly(elapsedMs: number, tr: (key: string) => string): string {
  const { h, m, s } = formatInfusionElapsedParts(elapsedMs);
  if (h > 0) {
    return tr("infusionTimeline.infusionElapsedH").replace("{h}", String(h)).replace("{m}", String(m));
  }
  if (m > 0) {
    return tr("infusionTimeline.infusionElapsedM").replace("{m}", String(m)).replace("{s}", String(s));
  }
  return tr("infusionTimeline.infusionElapsedS").replace("{s}", String(s));
}

export function formatInfusionElapsedForI18n(elapsedMs: number, tr: (key: string) => string): string {
  return tr("infusionTimeline.infusionElapsed").replace("{elapsed}", formatInfusionElapsedInnerOnly(elapsedMs, tr));
}

export function formatInfusionDurationForI18n(
  durationMinutes: number | null | undefined,
  tr: (key: string) => string
): string {
  const inner =
    durationMinutes != null && Number.isFinite(durationMinutes) && durationMinutes >= 0
      ? `${Math.floor(durationMinutes)} min`
      : tr("common.dash");
  return tr("infusionTimeline.infusionDuration").replace("{duration}", inner);
}

/**
 * Replays infusion-tagged order events for one order line (same rules as API infusion session).
 * `events` may be unsorted; replay sorts by `performedAt` ascending.
 * MAR START/STOP rows are workflow anchors; duration/billing evidence uses OrderEvent metadata only.
 */
export function findMedicationInfusionTimelineFromOrderEvents(
  events: ReadonlyArray<{
    orderId: string;
    eventType: string;
    performedAt: string;
    metadata?: unknown;
    performedByDisplayName?: string | null;
  }>,
  orderId: string,
  orderItemId: string
): MedicationInfusionTimelineResult {
  const sorted = [...events].sort(
    (a, b) => new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime()
  );
  const normOrderId = String(orderId ?? "").trim();
  const normItemId = String(orderItemId ?? "").trim();
  let active: MedicationInfusionActiveUi | null = null;
  const completed: MedicationInfusionCompletedTimelineUi[] = [];
  for (const ev of sorted) {
    if (String(ev.orderId ?? "").trim() !== normOrderId) continue;
    const m = parseMedicationInfusionOrderEventMetadata(ev.metadata);
    if (!m || String(m.orderItemId ?? "").trim() !== normItemId) continue;
    const et = String(ev.eventType ?? "").trim().toUpperCase();
    if (m.infusionAction === "START" && et === "STARTED" && m.infusionSessionKey) {
      const iso =
        typeof m.infusionStartedAt === "string" && m.infusionStartedAt.trim()
          ? m.infusionStartedAt.trim()
          : null;
      const p = readInfusionPerformerFromEvent(ev);
      active = {
        infusionSessionKey: m.infusionSessionKey,
        infusionStartedAtIso: iso,
        startedByDisplayName: p.display,
        startedByTitle: p.title,
      };
    } else if (
      m.infusionAction === "STOP" &&
      et === "COMPLETED" &&
      m.infusionSessionKey &&
      active?.infusionSessionKey === m.infusionSessionKey
    ) {
      const stopP = readInfusionPerformerFromEvent(ev);
      const stoppedIso =
        typeof m.infusionStoppedAt === "string" && m.infusionStoppedAt.trim()
          ? m.infusionStoppedAt.trim()
          : ev.performedAt;
      // Duration uses documented OrderEvent timestamps, not effective MAR correction times.
      let duration = m.durationMinutes != null && Number.isFinite(m.durationMinutes) ? m.durationMinutes : null;
      if (duration == null && active.infusionStartedAtIso) {
        const a = new Date(active.infusionStartedAtIso).getTime();
        const b = new Date(stoppedIso).getTime();
        if (!Number.isNaN(a) && !Number.isNaN(b) && b >= a) {
          duration = Math.max(0, Math.floor((b - a) / 60_000));
        }
      }
      completed.push({
        infusionSessionKey: m.infusionSessionKey,
        infusionStartedAtIso: active.infusionStartedAtIso,
        infusionStoppedAtIso: stoppedIso,
        durationMinutes: duration,
        startedByDisplayName: active.startedByDisplayName ?? null,
        startedByTitle: active.startedByTitle ?? null,
        stoppedByDisplayName: stopP.display,
        stoppedByTitle: stopP.title,
      });
      active = null;
    }
  }
  return {
    active,
    lastCompleted: completed.length > 0 ? completed[completed.length - 1]! : null,
  };
}

/**
 * @deprecated Prefer {@link findMedicationInfusionTimelineFromOrderEvents} when completed session UI is needed.
 */
export function findActiveMedicationInfusionFromOrderEvents(
  events: ReadonlyArray<{
    orderId: string;
    eventType: string;
    performedAt: string;
    metadata?: unknown;
    performedByDisplayName?: string | null;
  }>,
  orderId: string,
  orderItemId: string
): MedicationInfusionActiveUi | null {
  return findMedicationInfusionTimelineFromOrderEvents(events, orderId, orderItemId).active;
}

/** True if this completed order event row is an infusion STOP (for completed-order table). */
export function isMedicationInfusionStopOrderEvent(ev: { eventType: string; metadata?: unknown }): boolean {
  if (String(ev.eventType ?? "").trim().toUpperCase() !== "COMPLETED") return false;
  const m = parseMedicationInfusionOrderEventMetadata(ev.metadata);
  return m?.infusionAction === "STOP" && Boolean(m.orderItemId) && Boolean(m.infusionSessionKey);
}
