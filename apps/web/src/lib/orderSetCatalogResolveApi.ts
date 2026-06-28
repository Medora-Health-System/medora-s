import { apiFetch } from "./apiClient";
import type { CatalogSearchItem, CatalogType } from "./catalogSearchTypes";

type BatchResolveResponse = {
  results: Array<{
    requestId: string;
    item: CatalogSearchItem | null;
    ambiguous: boolean;
  }>;
};

export type OrderSetCatalogResolveRequestRow = {
  requestId: string;
  catalogType: Extract<CatalogType, "LAB_TEST" | "IMAGING_STUDY">;
  referenceCodes: string[];
  fallbackSearchQuery?: string;
};

export async function resolveOrderSetCatalogBatch(
  facilityId: string,
  rows: OrderSetCatalogResolveRequestRow[]
): Promise<Map<string, { item: CatalogSearchItem | null; ambiguous: boolean }>> {
  const out = new Map<string, { item: CatalogSearchItem | null; ambiguous: boolean }>();
  if (rows.length === 0) return out;

  const res = (await apiFetch("/catalog/order-set/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: rows.map((row) => ({
        requestId: row.requestId,
        catalogType: row.catalogType,
        referenceCodes: row.referenceCodes,
        ...(row.fallbackSearchQuery ? { fallbackSearchQuery: row.fallbackSearchQuery } : {}),
      })),
    }),
    facilityId,
  })) as BatchResolveResponse;

  for (const result of res?.results ?? []) {
    out.set(result.requestId, { item: result.item, ambiguous: result.ambiguous });
  }
  return out;
}
