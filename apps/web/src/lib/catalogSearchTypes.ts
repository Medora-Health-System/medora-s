/** Aligné sur l’API GET /catalog/.../search (réponse compacte). */
export type CatalogSearchItemType = "MEDICATION" | "LAB_TEST" | "IMAGING_STUDY";

export type CatalogSearchItem = {
  id: string;
  code: string;
  type: CatalogSearchItemType;
  displayNameFr: string;
  /** API `name` (English / primary); optional for older cached payloads. */
  name?: string;
  secondaryText?: string;
  searchText?: string;
  isFavorite?: boolean;
  isEssential?: boolean;
  metadata?: {
    strength?: string;
    dosageForm?: string;
    route?: string;
    ndc11?: string;
    billingUnitType?: string;
    category?: string;
    modality?: string;
    bodyRegion?: string;
    billingCodeDefault?: string;
  };
};

export type CatalogType = CatalogSearchItemType;
