import { apiFetch } from "@/lib/apiClient";
import { formatEncounterVitalsHistoryCompactLine } from "@/lib/patientVitals";
import type { SupportedLanguage } from "@/i18n/config";

/** Mirrors `ORDER_ITEM_ACTIVE_FOR_CATALOG_DEDUP` in apps/api (do not drift from backend). */
export const ACTIVE_ORDER_ITEM_STATUSES_FOR_CATALOG_DEDUP = new Set([
  "DRAFT",
  "PLACED",
  "PENDING",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "SIGNED",
]);

export type VitalsHistoryEntry = {
  recordedAt: string;
  vitals: Record<string, unknown>;
};

function numFromVitals(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.trim().replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Simple bedside guardrail flags (not a full MEWS). Used for light UI emphasis only.
 */
export function classifyVitalsAbnormalKeys(vitals: Record<string, unknown>): string[] {
  const flags: string[] = [];
  const hr = numFromVitals(vitals.hr);
  const rr = numFromVitals(vitals.rr);
  const spo2 = numFromVitals(vitals.spo2);
  const sys = numFromVitals(vitals.bpSys);
  const dia = numFromVitals(vitals.bpDia);
  const tempC = numFromVitals(vitals.tempC);

  if (hr != null && (hr < 50 || hr > 120)) flags.push("hr");
  if (rr != null && rr > 30) flags.push("rr");
  if (spo2 != null && spo2 < 92) flags.push("spo2");
  if (sys != null && sys < 90) flags.push("bpSys");
  if (dia != null && dia > 110) flags.push("bpDia");
  if (tempC != null && (tempC < 35.5 || tempC > 38.5)) flags.push("tempC");

  return flags;
}

export function parseVitalsHistoryEntries(data: unknown): VitalsHistoryEntry[] {
  const raw =
    data && typeof data === "object" && !Array.isArray(data) ? (data as { entries?: unknown }).entries : null;
  if (!Array.isArray(raw)) return [];
  const out: VitalsHistoryEntry[] = [];
  for (const e of raw) {
    if (!e || typeof e !== "object" || Array.isArray(e)) continue;
    const row = e as { recordedAt?: unknown; vitals?: unknown };
    if (typeof row.recordedAt !== "string") continue;
    if (!row.vitals || typeof row.vitals !== "object" || Array.isArray(row.vitals)) continue;
    out.push({ recordedAt: row.recordedAt, vitals: row.vitals as Record<string, unknown> });
  }
  return out;
}

export async function fetchLatestVitalsHistoryEntry(
  encounterId: string,
  facilityId: string
): Promise<VitalsHistoryEntry | null> {
  try {
    const data = await apiFetch(`/encounters/${encounterId}/vitals-history`, { facilityId });
    const entries = parseVitalsHistoryEntries(data);
    if (entries.length === 0) return null;
    entries.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    return entries[0] ?? null;
  } catch {
    return null;
  }
}

export function formatLatestVitalsLine(entry: VitalsHistoryEntry, language: SupportedLanguage): string {
  return formatEncounterVitalsHistoryCompactLine(entry.vitals, language);
}

/**
 * Keys of catalog line items that are already active on the encounter (same logic family as order-safety.guard).
 */
export function buildActiveCatalogDedupKeySetFromOrders(orders: unknown[]): Set<string> {
  const keys = new Set<string>();
  for (const order of orders) {
    if (!order || typeof order !== "object" || Array.isArray(order)) continue;
    const o = order as { status?: string; items?: unknown[] };
    if (o.status === "CANCELLED") continue;
    const items = Array.isArray(o.items) ? o.items : [];
    for (const raw of items) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const it = raw as { status?: string; catalogItemId?: string | null; catalogItemType?: string | null };
      const cid = typeof it.catalogItemId === "string" ? it.catalogItemId.trim() : "";
      const ctype = it.catalogItemType;
      if (!cid || !ctype) continue;
      if (
        ctype !== "LAB_TEST" &&
        ctype !== "IMAGING_STUDY" &&
        ctype !== "MEDICATION"
      ) {
        continue;
      }
      const st = String(it.status ?? "");
      if (!ACTIVE_ORDER_ITEM_STATUSES_FOR_CATALOG_DEDUP.has(st)) continue;
      keys.add(`${ctype}:${cid}`);
    }
  }
  return keys;
}
