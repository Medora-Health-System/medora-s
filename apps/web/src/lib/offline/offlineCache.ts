import { idbGet, idbList, idbSet } from "./offlineDb";
import type { CatalogSearchItem, CatalogType } from "@/lib/catalogSearchTypes";
import type { OfflineCacheRecord } from "./offlineTypes";

function nowIso() {
  return new Date().toISOString();
}

function catalogStore(type: CatalogType) {
  if (type === "MEDICATION") return "catalog_medications" as const;
  if (type === "LAB_TEST") return "catalog_lab" as const;
  return "catalog_imaging" as const;
}

export async function setCachedRecord<T>(
  store: "patient_summaries" | "encounter_summaries" | "latest_vitals" | "followups",
  localKey: string,
  data: T,
  meta?: { facilityId?: string; patientId?: string; encounterId?: string }
) {
  const row: OfflineCacheRecord<T> = {
    localKey,
    data,
    updatedAt: nowIso(),
    facilityId: meta?.facilityId ?? null,
    patientId: meta?.patientId ?? null,
    encounterId: meta?.encounterId ?? null,
  };
  await idbSet(store, row);
}

export async function getCachedRecord<T>(
  store: "patient_summaries" | "encounter_summaries" | "latest_vitals" | "followups",
  localKey: string
): Promise<OfflineCacheRecord<T> | null> {
  return idbGet<OfflineCacheRecord<T>>(store, localKey);
}

export async function setCatalogCache(
  facilityId: string,
  type: CatalogType,
  q: string,
  items: CatalogSearchItem[]
) {
  const key = `${facilityId}:${type}:${q.trim().toLowerCase()}`;
  await idbSet(catalogStore(type), {
    localKey: key,
    updatedAt: nowIso(),
    facilityId,
    data: items,
  } as OfflineCacheRecord<CatalogSearchItem[]>);
}

export async function searchCatalogCache(
  facilityId: string,
  type: CatalogType,
  q: string,
  limit = 20
): Promise<CatalogSearchItem[]> {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const rows = await idbList<OfflineCacheRecord<CatalogSearchItem[]>>(catalogStore(type));
  const pool = rows
    .filter((r) => r.facilityId === facilityId)
    .flatMap((r) => (Array.isArray(r.data) ? r.data : []));

  const uniq = new Map<string, CatalogSearchItem>();
  for (const item of pool) {
    uniq.set(`${item.type}:${item.id}`, item);
  }
  const items = [...uniq.values()];
  const score = (it: CatalogSearchItem) => {
    const name = (it.displayNameFr || "").toLowerCase();
    const code = (it.code || "").toLowerCase();
    const aliases = (it.searchText || "").toLowerCase();
    const hay = `${name} ${code} ${aliases}`;
    if (name === needle || code === needle) return 1000;
    if (name.startsWith(needle) || code.startsWith(needle)) return 800;
    if (aliases.includes(needle)) return 700;
    if (hay.includes(needle)) return 500;
    return 0;
  };
  return items
    .map((it) => ({ it, s: score(it) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.it);
}
