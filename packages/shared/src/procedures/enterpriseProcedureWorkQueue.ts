import {
  enterpriseProcedureById,
  resolveEnterpriseProcedureDisplayName,
  type EnterpriseProcedureExecutionRoleCategory,
} from "./enterpriseProcedureCatalog.js";
import { resolveProcedureExecutionProfile } from "./enterpriseProcedureExecutionProfile.js";
import {
  OXYGEN_THERAPY_PROCEDURE_CODE,
  resolveOxygenTherapyOrderDisplay,
} from "./oxygenTherapyOrderParameters.js";

const TERMINAL_ORDER_ITEM_STATUSES = new Set(["COMPLETED", "RESULTED", "VERIFIED", "CANCELLED"]);

export type ProcedureWorkQueueItem = {
  orderItemId: string;
  orderId: string;
  encounterId: string;
  enterpriseProcedureId: string;
  displayLabelEn: string;
  displayLabelFr: string;
  orderItemStatus: string;
  executionRoleCategory: EnterpriseProcedureExecutionRoleCategory;
};

export function isActiveProcedureOrderItemStatus(status: string | null | undefined): boolean {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (!normalized) return true;
  return !TERMINAL_ORDER_ITEM_STATUSES.has(normalized);
}

/** Collects active enterprise procedure CARE lines for dashboard work queues (no PHI beyond labels). */
export function collectProcedureWorkQueueItems(
  orders: readonly unknown[],
  options: {
    executionRoleCategory?: EnterpriseProcedureExecutionRoleCategory;
    encounterId?: string;
  } = {}
): ProcedureWorkQueueItem[] {
  const out: ProcedureWorkQueueItem[] = [];
  for (const rawOrder of orders) {
    if (!rawOrder || typeof rawOrder !== "object" || Array.isArray(rawOrder)) continue;
    const order = rawOrder as Record<string, unknown>;
    if (order.type !== "CARE" || order.status === "CANCELLED") continue;
    const orderId = String(order.id ?? "").trim();
    const encounterId = String(order.encounterId ?? options.encounterId ?? "").trim();
    if (!orderId || !encounterId) continue;
    const items = Array.isArray(order.items) ? order.items : [];
    for (const rawItem of items) {
      if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) continue;
      const item = rawItem as Record<string, unknown>;
      const orderItemId = String(item.id ?? "").trim();
      const enterpriseProcedureId = String(item.enterpriseProcedureId ?? "").trim();
      if (!orderItemId || !enterpriseProcedureId) continue;
      const orderItemStatus = String(item.status ?? "PENDING");
      if (!isActiveProcedureOrderItemStatus(orderItemStatus)) continue;
      const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId });
      if (!profile) continue;
      if (
        options.executionRoleCategory &&
        profile.executionRoleCategory !== options.executionRoleCategory
      ) {
        continue;
      }
      const entry = enterpriseProcedureById(enterpriseProcedureId);
      const manualLabel = typeof item.manualLabel === "string" ? item.manualLabel : null;
      const notes = typeof item.notes === "string" ? item.notes : null;
      const oxygenEn =
        enterpriseProcedureId === OXYGEN_THERAPY_PROCEDURE_CODE
          ? resolveOxygenTherapyOrderDisplay({ manualLabel, notes, locale: "en" })
          : null;
      const oxygenFr =
        enterpriseProcedureId === OXYGEN_THERAPY_PROCEDURE_CODE
          ? resolveOxygenTherapyOrderDisplay({ manualLabel, notes, locale: "fr" })
          : null;
      out.push({
        orderItemId,
        orderId,
        encounterId,
        enterpriseProcedureId,
        displayLabelEn: oxygenEn?.title
          ?? (entry ? resolveEnterpriseProcedureDisplayName(entry, "en") : enterpriseProcedureId),
        displayLabelFr: oxygenFr?.title
          ?? (entry ? resolveEnterpriseProcedureDisplayName(entry, "fr") : enterpriseProcedureId),
        orderItemStatus,
        executionRoleCategory: profile.executionRoleCategory,
      });
    }
  }
  return out;
}

export function countProcedureWorkQueueItems(
  orders: readonly unknown[],
  executionRoleCategory: EnterpriseProcedureExecutionRoleCategory
): number {
  return collectProcedureWorkQueueItems(orders, { executionRoleCategory }).length;
}
