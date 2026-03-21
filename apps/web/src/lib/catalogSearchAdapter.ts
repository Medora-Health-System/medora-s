import { searchCatalog } from "./catalogSearchApi";
import type { CatalogSearchItem, CatalogType } from "./catalogSearchTypes";

export type CatalogSearchParams = {
  facilityId: string;
  catalogType: CatalogType;
  q: string;
  limit: number;
  /** Uniquement pour MEDICATION */
  favoritesFirst?: boolean;
};

/**
 * Point d’extension pour le mode hors-ligne : brancher une implémentation locale (Index / SQLite)
 * sans changer les écrans.
 */
export interface CatalogSearchAdapter {
  search(params: CatalogSearchParams): Promise<CatalogSearchItem[]>;
}

export function createRemoteCatalogSearchAdapter(): CatalogSearchAdapter {
  return {
    async search(params) {
      return searchCatalog(params.facilityId, params.catalogType, {
        q: params.q,
        limit: params.limit,
        favoritesFirst: params.favoritesFirst,
      });
    },
  };
}

/** Réserve pour index local (catalogues synchronisés). */
export function createStubLocalCatalogSearchAdapter(): CatalogSearchAdapter {
  return {
    async search() {
      return [];
    },
  };
}
