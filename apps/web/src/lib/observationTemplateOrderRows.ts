/**
 * Phase 15F-D.3 — flatten observation template CARE orders to independent actionable rows.
 */

import {
  collectObservationTemplateItemIdsFromOrderItems,
  deriveObservationTemplateLineLifecyclePhase,
  isObservationOrderTemplateProtocol,
  observationOrderTemplateItemManualLabel,
  observationTemplateItemIdFromPersistedManualLabel,
  observationTemplateLineAllowsInProgressStart,
  type ObservationTemplateLineLifecyclePhase,
} from "@medora/shared";
import type { SupportedLanguage } from "@/i18n/config";
import { getOrderItemDisplayLabelFromLocale } from "@/lib/orderItemDisplayFr";

export type ObservationTemplateOrderRow = {
  itemId: string;
  orderId: string;
  templateItemId: string | null;
  label: string;
  status: string;
  lifecyclePhase: ObservationTemplateLineLifecyclePhase;
  orderedBy: string | null;
  orderedAtIso: string | null;
  acknowledgedBy: string | null;
  acknowledgedAtIso: string | null;
  performedBy: string | null;
  completedAtIso: string | null;
  inProgressAtIso: string | null;
  cancelled: boolean;
  cancellationReason: string | null;
  allowsInProgressStart: boolean;
};

type OrderEventRow = {
  eventType?: string;
  performedAt?: string;
  performedByDisplayName?: string | null;
  roleSnapshot?: string | null;
  metadata?: unknown;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v != null && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function isObservationTemplateOrder(order: Record<string, unknown>): boolean {
  if (String(order.type ?? "") !== "CARE") return false;
  if (order.cancelledAt) return false;
  const authority = asRecord(order.authority);
  if (isObservationOrderTemplateProtocol(typeof authority?.protocolName === "string" ? authority.protocolName : null)) {
    return true;
  }
  return false;
}

function formatActor(name: string | null | undefined, role: string | null | undefined): string | null {
  const n = name?.trim() || null;
  const r = role?.trim();
  if (n && r) return `${n}, ${r}`;
  return n;
}

function findItemAckEvent(events: OrderEventRow[], itemId: string): OrderEventRow | null {
  for (const e of events) {
    const meta = asRecord(e.metadata);
    if (meta?.orderItemId !== itemId) continue;
    if (meta?.lifecycleOutcome === "ACKNOWLEDGED" || e.eventType === "ACKNOWLEDGED") {
      return e;
    }
  }
  return null;
}

function findItemStartEvent(events: OrderEventRow[], itemId: string): OrderEventRow | null {
  for (const e of events) {
    if (e.eventType !== "STARTED") continue;
    const meta = asRecord(e.metadata);
    if (meta?.orderItemId !== itemId) continue;
    if (meta?.lifecycleOutcome === "ACKNOWLEDGED") continue;
    return e;
  }
  return null;
}

function findItemCompleteEvent(events: OrderEventRow[], itemId: string): OrderEventRow | null {
  for (const e of events) {
    if (e.eventType !== "COMPLETED") continue;
    const meta = asRecord(e.metadata);
    if (meta?.orderItemId && meta.orderItemId !== itemId) continue;
    return e;
  }
  return null;
}

export function flattenObservationTemplateOrders(
  orders: unknown[],
  orderEvents: unknown[],
  language: SupportedLanguage
): ObservationTemplateOrderRow[] {
  const events: OrderEventRow[] = [];
  for (const raw of orderEvents) {
    const o = asRecord(raw);
    if (!o) continue;
    events.push({
      eventType: typeof o.eventType === "string" ? o.eventType : undefined,
      performedAt: typeof o.performedAt === "string" ? o.performedAt : undefined,
      performedByDisplayName:
        typeof o.performedByDisplayName === "string" ? o.performedByDisplayName : null,
      roleSnapshot: typeof o.roleSnapshot === "string" ? o.roleSnapshot : null,
      metadata: o.metadata,
    });
  }

  const rows: ObservationTemplateOrderRow[] = [];

  for (const raw of orders) {
    const order = asRecord(raw);
    if (!order || !isObservationTemplateOrder(order)) continue;

    const orderCreatedAt =
      typeof order.createdAt === "string" ? order.createdAt : null;
    const createdByDisplay = asRecord(order.createdByDisplay);
    const orderedByFromOrder =
      typeof createdByDisplay?.name === "string"
        ? createdByDisplay.name.trim()
        : typeof order.orderedByDisplayFr === "string"
          ? order.orderedByDisplayFr.trim()
          : null;

    const items = Array.isArray(order.items) ? order.items : [];
    for (const itRaw of items) {
      const it = asRecord(itRaw);
      if (!it) continue;
      const itemId = typeof it.id === "string" ? it.id : "";
      if (!itemId) continue;
      const status = String(it.status ?? it.lifecycleState ?? "PLACED").toUpperCase();
      const templateItemId =
        observationTemplateItemIdFromPersistedManualLabel(
          typeof it.manualLabel === "string" ? it.manualLabel : null
        ) ?? null;
      const label =
        (templateItemId
          ? observationOrderTemplateItemManualLabel(templateItemId, language === "en" ? "en" : "fr")
          : null) ||
        getOrderItemDisplayLabelFromLocale(it, language) ||
        String(it.manualLabel ?? "").trim() ||
        "—";
      const ackEv = findItemAckEvent(events, itemId);
      const startEv = findItemStartEvent(events, itemId);
      const completeEv = findItemCompleteEvent(events, itemId);
      const cancelled =
        status === "CANCELLED" || String(it.lifecycleState ?? "").toUpperCase() === "CANCELLED";
      const lifecyclePhase = deriveObservationTemplateLineLifecyclePhase({ status, cancelled });
      const completedAtIso =
        (typeof it.completedAt === "string" ? it.completedAt : null) ||
        (typeof it.documentedCompletedAt === "string" ? it.documentedCompletedAt : null) ||
        completeEv?.performedAt ||
        null;

      rows.push({
        itemId,
        orderId: String(order.id ?? ""),
        templateItemId,
        label,
        status,
        lifecyclePhase,
        orderedBy: orderedByFromOrder,
        orderedAtIso: orderCreatedAt,
        acknowledgedBy: formatActor(ackEv?.performedByDisplayName, ackEv?.roleSnapshot),
        acknowledgedAtIso: ackEv?.performedAt ?? null,
        performedBy: formatActor(completeEv?.performedByDisplayName, completeEv?.roleSnapshot),
        completedAtIso,
        inProgressAtIso: startEv?.performedAt ?? null,
        cancelled,
        cancellationReason:
          typeof it.cancellationReason === "string" ? it.cancellationReason : null,
        allowsInProgressStart: observationTemplateLineAllowsInProgressStart(templateItemId),
      });
    }
  }

  rows.sort((a, b) => {
    const ao = orders.findIndex((o) => asRecord(o)?.id === a.orderId);
    const bo = orders.findIndex((o) => asRecord(o)?.id === b.orderId);
    if (ao !== bo) return ao - bo;
    return a.label.localeCompare(b.label, language === "en" ? "en" : "fr");
  });

  return rows;
}

export function observationTemplateOrdersFromList(orders: unknown[]): unknown[] {
  return orders.filter((o) => {
    const rec = asRecord(o);
    return rec && isObservationTemplateOrder(rec);
  });
}

export function ordersExcludingObservationTemplate(orders: unknown[]): unknown[] {
  return orders.filter((o) => {
    const rec = asRecord(o);
    return rec && !isObservationTemplateOrder(rec);
  });
}

export function existingObservationTemplateItemIdsFromOrders(orders: unknown[]): string[] {
  const collected: { manualLabel?: string | null; status?: string | null; lifecycleState?: string | null }[] =
    [];
  for (const o of observationTemplateOrdersFromList(orders)) {
    const rec = asRecord(o);
    const items = Array.isArray(rec?.items) ? rec!.items : [];
    for (const it of items) {
      const row = asRecord(it);
      if (!row) continue;
      collected.push({
        manualLabel: typeof row.manualLabel === "string" ? row.manualLabel : null,
        status: typeof row.status === "string" ? row.status : null,
        lifecycleState: typeof row.lifecycleState === "string" ? row.lifecycleState : null,
      });
    }
  }
  return collectObservationTemplateItemIdsFromOrderItems(collected);
}
