/** Aligné sur l’API GET /catalog/.../search (réponse compacte). */
export type CatalogSearchItemType = "MEDICATION" | "LAB_TEST" | "IMAGING_STUDY";

export type CatalogSearchItem = {
  id: string;
  code: string;
  type: CatalogSearchItemType;
  displayNameFr: string;
  /** English-primary display from API; optional / null until backfilled. */
  displayNameEn?: string | null;
  /** API `name` (English / primary); optional for older cached payloads. */
  name?: string;
  secondaryText?: string;
  /** API M1.7A.3 — locale-specific medication subtitle lines. */
  secondaryTextFr?: string;
  secondaryTextEn?: string;
  searchText?: string;
  isFavorite?: boolean;
  isEssential?: boolean;
  metadata?: {
    strength?: string;
    dosageForm?: string;
    route?: string;
    ndc11?: string;
    billingUnitType?: string;
    isControlled?: boolean;
    controlledSchedule?: string;
    requiresWitness?: boolean;
    requiresDoubleSign?: boolean;
    genericName?: string;
    therapeuticClass?: string;
    administrationType?: string;
    billingClass?: string;
    commonAliases?: string[];
    category?: string;
    modality?: string;
    bodyRegion?: string;
    billingCodeDefault?: string;
    /** Phase 19C.2 — read-only canonical hints; ordering still uses catalog `id`. */
    canonicalReadOnly?: {
      matchConfidence: "LEGACY_LINK";
      badges: {
        edFormulary: boolean;
        rsi: boolean;
        crashCart: boolean;
        infusion: boolean;
        controlled: boolean;
        highAlert: boolean;
        billingReview: boolean;
        ndcPresent: boolean;
      };
      canonicalAliases?: string[];
    };
  };
};

export type CatalogType = CatalogSearchItemType;
