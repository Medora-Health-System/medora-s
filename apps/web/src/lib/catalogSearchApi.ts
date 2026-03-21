import { apiFetch } from "./apiClient";
import type { CatalogSearchItem, CatalogType } from "./catalogSearchTypes";

type SearchResponse = { items: CatalogSearchItem[] };

function pathForType(type: CatalogType): string {
  switch (type) {
    case "MEDICATION":
      return "/catalog/medications/search";
    case "LAB_TEST":
      return "/catalog/lab-tests/search";
    case "IMAGING_STUDY":
      return "/catalog/imaging-studies/search";
    default:
      return "/catalog/lab-tests/search";
  }
}

export async function searchCatalog(
  facilityId: string,
  catalogType: CatalogType,
  params: { q: string; limit?: number; favoritesFirst?: boolean }
): Promise<CatalogSearchItem[]> {
  const q = new URLSearchParams();
  q.set("q", params.q.trim());
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.favoritesFirst) q.set("favoritesFirst", "true");
  const res = (await apiFetch(`${pathForType(catalogType)}?${q.toString()}`, {
    facilityId,
  })) as SearchResponse;
  return Array.isArray(res?.items) ? res.items : [];
}
