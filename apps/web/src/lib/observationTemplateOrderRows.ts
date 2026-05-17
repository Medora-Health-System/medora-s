/**
 * Phase 15F-D.3 — flatten observation template CARE orders to independent actionable rows.
 */

import {
  collectObservationTemplateItemIdsFromOrderItems,
  isObservationOrderTemplateProtocol,
  observationOrderTemplateItemManualLabel,
  observationTemplateItemIdFromPersistedManualLabel,
} from "@medora/shared";
import type { SupportedLanguage } from "@/i18n/config";
import { getOrderItemDisplayLabelFromLocale } from "@/lib/orderItemDisplayFr";

export type ObservationTemplateOrderRow = {
  itemId: string;
  orderId: string;
  templateItemId: string | null;
  label: string;
  status: string;
  acknowledgedBy: string | null;
  acknowledgedAtIso: string | null;
  cancelled: boolean;
  cancellationReason: string | null;
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
      const ackName = ackEv?.performedByDisplayName?.trim() || null;
      const ackRole = ackEv?.roleSnapshot?.trim();
      const acknowledgedBy =
        ackName && ackRole ? `${ackName}, ${ackRole}` : ackName || null;
      const cancelled =
        status === "CANCELLED" || String(it.lifecycleState ?? "").toUpperCase() === "CANCELLED";
      rows.push({
        itemId,
        orderId: String(order.id ?? ""),
        templateItemId,
        label,
        status,
        acknowledgedBy,
        acknowledgedAtIso: ackEv?.performedAt ?? null,
        cancelled,
        cancellationReason:
          typeof it.cancellationReason === "string" ? it.cancellationReason : null,
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
