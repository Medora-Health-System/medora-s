/**
 * @deprecated Importez `searchCatalog` depuis `@/lib/catalogSearchApi` et `CatalogSearchItem` depuis `@/lib/catalogSearchTypes`.
 */
import { searchCatalog } from "./catalogSearchApi";
import type { CatalogSearchItem } from "./catalogSearchTypes";

export type OrderCatalogSearchItem = CatalogSearchItem;

export async function searchLabCatalog(
  facilityId: string,
  params: { q: string; limit?: number }
): Promise<{ items: OrderCatalogSearchItem[] }> {
  const items = await searchCatalog(facilityId, "LAB_TEST", {
    q: params.q,
    limit: params.limit,
  });
  return { items };
}

export async function searchImagingCatalog(
  facilityId: string,
  params: { q: string; limit?: number }
): Promise<{ items: OrderCatalogSearchItem[] }> {
  const items = await searchCatalog(facilityId, "IMAGING_STUDY", {
    q: params.q,
    limit: params.limit,
  });
  return { items };
}
