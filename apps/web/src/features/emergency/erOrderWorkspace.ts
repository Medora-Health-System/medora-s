/**
 * ER cockpit — agrégation des ordres consultation pour affichage opérationnel.
 * Aligné sur la forme renvoyée par GET /encounters/:id/orders (même source que l’onglet Ordres).
 */

import { isOrderItemDoneForChart } from "@/constants/orderStatusLabels";
import { medicationOrderStatusKeyForEncounterTab, type OrderLikeForCancelGate } from "@/lib/orderEncounterUi";

export type ErOrderDomain = "LAB" | "IMAGING" | "MEDICATION" | "CARE";

const DOMAINS: ErOrderDomain[] = ["LAB", "IMAGING", "MEDICATION", "CARE"];

function isRecord(o: unknown): o is Record<string, unknown> {
  return o !== null && typeof o === "object" && !Array.isArray(o);
}

function effectiveStatusKey(order: Record<string, unknown>): string {
  const t = order.type;
  if (t === "MEDICATION") {
    return medicationOrderStatusKeyForEncounterTab({
      type: "MEDICATION",
      status: typeof order.status === "string" ? order.status : undefined,
      items: Array.isArray(order.items) ? (order.items as OrderLikeForCancelGate["items"]) : undefined,
    });
  }
  return typeof order.status === "string" ? order.status : "";
}

function bucket(statusKey: string): "pending" | "active" | "done" | "cancelled" {
  if (statusKey === "CANCELLED") return "cancelled";
  if (isOrderItemDoneForChart(statusKey)) return "done";
  if (statusKey === "PENDING" || statusKey === "") return "pending";
  return "active";
}

export type ErDomainOrderStats = {
  count: number;
  pending: number;
  active: number;
  done: number;
  cancelled: number;
};

export type ErOrdersWorkspaceSummary = {
  total: number;
  byDomain: Record<ErOrderDomain, ErDomainOrderStats>;
  /** Synthèse globale (tous types) */
  global: ErDomainOrderStats;
};

const emptyDomain = (): ErDomainOrderStats => ({
  count: 0,
  pending: 0,
  active: 0,
  done: 0,
  cancelled: 0,
});

function addToDomain(stats: ErDomainOrderStats, statusKey: string): void {
  stats.count += 1;
  const b = bucket(statusKey);
  if (b === "pending") stats.pending += 1;
  else if (b === "active") stats.active += 1;
  else if (b === "done") stats.done += 1;
  else stats.cancelled += 1;
}

/**
 * Résume les ordres pour le cockpit urgences (compte par domaine + file d’exécution).
 */
export function summarizeErOrdersWorkspace(orders: unknown[]): ErOrdersWorkspaceSummary {
  const byDomain: Record<ErOrderDomain, ErDomainOrderStats> = {
    LAB: emptyDomain(),
    IMAGING: emptyDomain(),
    MEDICATION: emptyDomain(),
    CARE: emptyDomain(),
  };
  const global = emptyDomain();

  if (!Array.isArray(orders)) {
    return { total: 0, byDomain, global };
  }

  for (const raw of orders) {
    if (!isRecord(raw)) continue;
    const t = raw.type;
    const domain: ErOrderDomain | null =
      t === "LAB" || t === "IMAGING" || t === "MEDICATION" || t === "CARE" ? t : null;
    if (!domain) continue;

    const statusKey = effectiveStatusKey(raw);
    addToDomain(byDomain[domain], statusKey);
    addToDomain(global, statusKey);
  }

  const total = DOMAINS.reduce((s, d) => s + byDomain[d].count, 0);
  return { total, byDomain, global };
}

export function formatDomainLabelFr(domain: ErOrderDomain): string {
  switch (domain) {
    case "LAB":
      return "Laboratoire";
    case "IMAGING":
      return "Imagerie";
    case "MEDICATION":
      return "Médication";
    case "CARE":
      return "Soins / procédures";
    default:
      return domain;
  }
}
