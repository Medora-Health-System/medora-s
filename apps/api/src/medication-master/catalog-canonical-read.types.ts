/** Phase 19C.2 — read-only canonical metadata attached to CatalogMedication search (no canonical UUIDs). */

export type CatalogCanonicalMatchConfidence = "LEGACY_LINK";

export type CatalogCanonicalReadBadges = {
  edFormulary: boolean;
  rsi: boolean;
  crashCart: boolean;
  infusion: boolean;
  controlled: boolean;
  highAlert: boolean;
  billingReview: boolean;
  ndcPresent: boolean;
};

export type CatalogCanonicalReadMetadata = {
  matchConfidence: CatalogCanonicalMatchConfidence;
  badges: CatalogCanonicalReadBadges;
  /** Display-only aliases from canonical master (not used for ordering). */
  canonicalAliases: string[];
};
