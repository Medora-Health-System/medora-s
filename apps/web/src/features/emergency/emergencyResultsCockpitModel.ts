/**
 * Shared lab/rad cockpit model for Emergency results panel and visit summary (read-only).
 */

import type { EncounterLabRadRow, EncounterResultsLabRadSnapshot } from "@/components/encounters/EncounterResultsTab";
import { clinicalResultFromOrderItemLike } from "@/lib/clinicalResultNormalize";
import { getOrderItemDisplayLabelFr } from "@/lib/orderItemDisplayFr";

function orderCreatedMs(order: unknown): number {
  if (!order || typeof order !== "object") return 0;
  const c = (order as { createdAt?: string }).createdAt;
  if (typeof c !== "string" || !c.trim()) return 0;
  const t = Date.parse(c);
  return Number.isNaN(t) ? 0 : t;
}

function rowRecencyMs(row: EncounterLabRadRow): number {
  const v = clinicalResultFromOrderItemLike({
    displayLabelFr: getOrderItemDisplayLabelFr(row.item),
    status: row.item.status,
    catalogItemType: row.item.catalogItemType,
    result: row.item.result,
  });
  if (v.verifiedAt) {
    const t = Date.parse(v.verifiedAt);
    if (!Number.isNaN(t)) return t;
  }
  return orderCreatedMs(row.order);
}

function pickLatestByType(rows: EncounterLabRadRow[], type: "LAB_TEST" | "IMAGING_STUDY"): EncounterLabRadRow | null {
  const filtered = rows.filter((r) => r.item.catalogItemType === type);
  if (filtered.length === 0) return null;
  return [...filtered].sort((a, b) => rowRecencyMs(b) - rowRecencyMs(a))[0] ?? null;
}

export function buildErResultsCockpitModel(snap: EncounterResultsLabRadSnapshot | null) {
  if (!snap || snap.loading) {
    return {
      ready: false as const,
      failed: false,
      empty: true,
      labLatest: null as EncounterLabRadRow | null,
      imagingLatest: null as EncounterLabRadRow | null,
      priorityRows: [] as EncounterLabRadRow[],
      labTotal: 0,
      imagingTotal: 0,
      pendingSyncCount: 0,
    };
  }
  if (snap.ordersLoadFailedNoCache) {
    return {
      ready: true as const,
      failed: true,
      empty: true,
      labLatest: null as EncounterLabRadRow | null,
      imagingLatest: null as EncounterLabRadRow | null,
      priorityRows: [] as EncounterLabRadRow[],
      labTotal: 0,
      imagingTotal: 0,
      pendingSyncCount: 0,
    };
  }
  const rows = snap.rows;
  let labTotal = 0;
  let imagingTotal = 0;
  let pendingSyncCount = 0;
  for (const r of rows) {
    if (r.item.catalogItemType === "LAB_TEST") labTotal += 1;
    if (r.item.catalogItemType === "IMAGING_STUDY") imagingTotal += 1;
    if (r.pendingSync) pendingSyncCount += 1;
  }
  const labLatest = pickLatestByType(rows, "LAB_TEST");
  const imagingLatest = pickLatestByType(rows, "IMAGING_STUDY");

  const priorityRows: EncounterLabRadRow[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const crit =
      r.item.result &&
      typeof r.item.result === "object" &&
      (r.item.result as { criticalValue?: boolean }).criticalValue === true;
    if (r.pendingSync || crit) {
      const id = typeof r.item.id === "string" ? r.item.id : String(r.item.id ?? "");
      if (id && !seen.has(id)) {
        seen.add(id);
        priorityRows.push(r);
      }
    }
  }
  priorityRows.sort((a, b) => rowRecencyMs(b) - rowRecencyMs(a));

  return {
    ready: true as const,
    failed: false,
    empty: rows.length === 0,
    labLatest,
    imagingLatest,
    priorityRows: priorityRows.slice(0, 6),
    labTotal,
    imagingTotal,
    pendingSyncCount,
  };
}
