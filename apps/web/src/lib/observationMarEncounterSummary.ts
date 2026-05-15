import type { MedicationInfusionCandidateInput } from "@medora/shared";
import { isMedicationInfusionCandidate, resolveMedicationMarActionFromStorage } from "@medora/shared";
import type { SupportedLanguage } from "@/i18n/config";
import {
  findMedicationInfusionTimelineFromOrderEvents,
  medicationInfusionClassificationText,
  medicationRouteSnapshotForInfusionCheck,
} from "@/features/emergency/erOrderLifecycleUi";
import { getOrderItemDisplayLabelForLanguage } from "@/lib/orderItemDisplayFr";
import { countPendingNurseMedicationLines, isOrderItemPendingNurseMedication } from "@/lib/nurseMedicationWorkload";
import { medicationMarIntendedTimingUrgency } from "@/lib/medicationMarIntendedUrgency";

type OrderEventLite = {
  orderId: string;
  eventType: string;
  performedAt: string;
  metadata?: unknown;
  performedByDisplayName?: string | null;
};

function parseOrderEventsLite(raw: unknown): OrderEventLite[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row))
    .map((row) => ({
      orderId: String(row.orderId ?? ""),
      eventType: String(row.eventType ?? "").trim(),
      performedAt: String(row.performedAt ?? ""),
      metadata: row.metadata,
      performedByDisplayName:
        typeof row.performedByDisplayName === "string" ? row.performedByDisplayName : null,
    }))
    .filter((e) => e.orderId && e.performedAt);
}

type AdminLite = {
  orderItemId: string | null;
  administeredAt: string;
  marAction?: string | null;
  notes: string | null;
};

function adminsByOrderItemIdDesc(admins: unknown[]): Map<string, AdminLite[]> {
  const m = new Map<string, AdminLite[]>();
  for (const raw of admins) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const r = raw as Record<string, unknown>;
    const orderItemId =
      typeof r.orderItemId === "string" ? r.orderItemId.trim() : r.orderItemId != null ? String(r.orderItemId).trim() : "";
    if (!orderItemId) continue;
    const administeredAt = typeof r.administeredAt === "string" ? r.administeredAt : "";
    if (!administeredAt) continue;
    const row: AdminLite = {
      orderItemId,
      administeredAt,
      marAction: typeof r.marAction === "string" ? r.marAction : null,
      notes: typeof r.notes === "string" ? r.notes : null,
    };
    const list = m.get(orderItemId) ?? [];
    list.push(row);
    m.set(orderItemId, list);
  }
  for (const [k, list] of m.entries()) {
    list.sort((a, b) => new Date(b.administeredAt).getTime() - new Date(a.administeredAt).getTime());
    m.set(k, list);
  }
  return m;
}

function isInfusionLifecycleMedicationLine(it: Record<string, unknown>, displayLabel: string): boolean {
  const fulfillment = String(it.medicationFulfillmentIntent ?? "ADMINISTER_CHART");
  const routeSnap = medicationRouteSnapshotForInfusionCheck(it);
  const catM = it.catalogMedication;
  const catRow = catM && typeof catM === "object" ? (catM as Record<string, unknown>) : null;
  const rawClassText = medicationInfusionClassificationText(it).trim();
  const medicationLabelForClass = (rawClassText || displayLabel.trim()).trim() || null;
  const infusionClassifyPayload: MedicationInfusionCandidateInput = {
    route: routeSnap.trim() || null,
    medicationLabel: medicationLabelForClass,
    code: typeof catRow?.code === "string" ? catRow.code : null,
    genericName: typeof catRow?.genericName === "string" ? catRow.genericName : null,
    metadata: null,
    catalogAdministrationType:
      typeof catRow?.administrationType === "string" ? catRow.administrationType : null,
  };
  return (
    String(it.catalogItemType ?? "") === "MEDICATION" &&
    fulfillment === "ADMINISTER_CHART" &&
    isMedicationInfusionCandidate(infusionClassifyPayload)
  );
}

export type ObservationMarEncounterSummary = {
  /** MAR-eligible medication lines not in terminal order-item status (same as `countPendingNurseMedicationLines`). */
  pendingMedicationLines: number;
  /** Lines with `intendedAdministrationAt` in the past and no “administered” MAR outcome on latest row. */
  overdueMedicationLines: number;
  /** Infusion-capable pending lines with an active STARTED session in order events. */
  activeInfusionSessions: number;
};

/**
 * Read-only digest for observation workflow — mirrors MAR tab eligibility and intended-time
 * display rules without performing administrations.
 */
export function computeObservationMarEncounterSummary(
  orders: unknown[],
  admins: unknown[],
  orderEventsRaw: unknown,
  nowMs: number,
  language: SupportedLanguage,
  t: (k: string) => string
): ObservationMarEncounterSummary {
  const pendingMedicationLines = countPendingNurseMedicationLines(orders);
  const adminMap = adminsByOrderItemIdDesc(admins);
  const events = parseOrderEventsLite(orderEventsRaw);

  let overdueMedicationLines = 0;
  let activeInfusionSessions = 0;

  if (!Array.isArray(orders)) {
    return { pendingMedicationLines: 0, overdueMedicationLines: 0, activeInfusionSessions: 0 };
  }

  for (const order of orders) {
    if (!order || typeof order !== "object" || Array.isArray(order)) continue;
    const orec = order as Record<string, unknown>;
    if (String(orec.status ?? "") === "CANCELLED") continue;
    const parentOrderId = String(orec.id ?? "").trim();
    const items = Array.isArray(orec.items) ? orec.items : [];
    for (const it of items) {
      if (!it || typeof it !== "object" || Array.isArray(it)) continue;
      const item = it as Record<string, unknown>;
      if (!isOrderItemPendingNurseMedication(item as Parameters<typeof isOrderItemPendingNurseMedication>[0])) continue;
      const itemId = typeof item.id === "string" ? item.id.trim() : item.id != null ? String(item.id).trim() : "";
      if (!itemId || itemId.startsWith("local:")) continue;
      const embeddedOrderIdRaw = item.orderId;
      const embeddedOrderId =
        typeof embeddedOrderIdRaw === "string"
          ? embeddedOrderIdRaw.trim()
          : embeddedOrderIdRaw != null && String(embeddedOrderIdRaw).trim() !== ""
            ? String(embeddedOrderIdRaw).trim()
            : "";
      const orderId = parentOrderId || embeddedOrderId;
      const label = getOrderItemDisplayLabelForLanguage(
        item as Parameters<typeof getOrderItemDisplayLabelForLanguage>[0],
        language,
        t
      );
      const latest = adminMap.get(itemId)?.[0];
      const marSaysAdministered =
        resolveMedicationMarActionFromStorage({
          marAction: latest?.marAction ?? null,
          notes: latest?.notes ?? null,
        }) === "administered";
      const intendedRaw = item.intendedAdministrationAt;
      const intendedAt = typeof intendedRaw === "string" ? intendedRaw : null;
      if (medicationMarIntendedTimingUrgency(intendedAt, nowMs, marSaysAdministered) === "overdue") {
        overdueMedicationLines += 1;
      }
      if (isInfusionLifecycleMedicationLine(item, label) && orderId) {
        const tl = findMedicationInfusionTimelineFromOrderEvents(events, orderId, itemId);
        if (tl.active) activeInfusionSessions += 1;
      }
    }
  }

  return { pendingMedicationLines, overdueMedicationLines, activeInfusionSessions };
}
