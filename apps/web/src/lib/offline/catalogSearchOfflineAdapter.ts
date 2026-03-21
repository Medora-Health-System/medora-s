import { createRemoteCatalogSearchAdapter, type CatalogSearchAdapter, type CatalogSearchParams } from "@/lib/catalogSearchAdapter";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";
import { searchCatalogCache, setCatalogCache } from "./offlineCache";

export function createOfflineAwareCatalogSearchAdapter(): CatalogSearchAdapter {
  const remote = createRemoteCatalogSearchAdapter();
  return {
    async search(params: CatalogSearchParams): Promise<CatalogSearchItem[]> {
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
      if (isOffline) {
        return searchCatalogCache(params.facilityId, params.catalogType, params.q, params.limit);
      }
      try {
        const rows = await remote.search(params);
        void setCatalogCache(params.facilityId, params.catalogType, params.q, rows);
        return rows;
      } catch {
        return searchCatalogCache(params.facilityId, params.catalogType, params.q, params.limit);
      }
    },
  };
}
