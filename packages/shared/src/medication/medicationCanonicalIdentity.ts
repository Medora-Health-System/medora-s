import { z } from "zod";

/** RxNorm concept mapping lifecycle on `MedicationConcept`. */
export const RXNORM_MAPPING_STATUS_VALUES = [
  "UNMAPPED",
  "CANDIDATE",
  "VERIFIED",
  "REJECTED",
  "RETIRED",
] as const;

export type RxNormMappingStatus = (typeof RXNORM_MAPPING_STATUS_VALUES)[number];

export const rxNormMappingStatusSchema = z.enum(RXNORM_MAPPING_STATUS_VALUES);

export const RXNORM_MAPPING_CONFIDENCE_VALUES = ["EXACT", "HIGH", "MEDIUM", "LOW"] as const;

export type RxNormMappingConfidence = (typeof RXNORM_MAPPING_CONFIDENCE_VALUES)[number];

export const rxNormMappingConfidenceSchema = z.enum(RXNORM_MAPPING_CONFIDENCE_VALUES);

/** Dual-layer linkage between canonical product and legacy `CatalogMedication`. */
export const DUAL_LAYER_LINKAGE_STATUS_VALUES = [
  "UNLINKED",
  "CANDIDATE",
  "VERIFIED",
  "REJECTED",
  "DO_NOT_LINK",
] as const;

export type DualLayerLinkageStatus = (typeof DUAL_LAYER_LINKAGE_STATUS_VALUES)[number];

export const dualLayerLinkageStatusSchema = z.enum(DUAL_LAYER_LINKAGE_STATUS_VALUES);

export const DUAL_LAYER_LINKAGE_METHOD_VALUES = [
  "MANUAL",
  "MANIFEST",
  "CODE_EXACT",
  "DERIVED",
  "IMPORT",
] as const;

export type DualLayerLinkageMethod = (typeof DUAL_LAYER_LINKAGE_METHOD_VALUES)[number];

export const dualLayerLinkageMethodSchema = z.enum(DUAL_LAYER_LINKAGE_METHOD_VALUES);

/** Product ↔ route M:N eligibility on `MedicationProductRoutePermission`. */
export const ROUTE_ELIGIBILITY_STATUS_VALUES = [
  "ALLOWED",
  "RESTRICTED",
  "INACTIVE",
  "DEPRECATED",
  "REQUIRES_CONFIGURATION",
  "NOT_VERIFIED",
] as const;

export type RouteEligibilityStatus = (typeof ROUTE_ELIGIBILITY_STATUS_VALUES)[number];

export const routeEligibilityStatusSchema = z.enum(ROUTE_ELIGIBILITY_STATUS_VALUES);

export const MEDICATION_ROUTE_CLINICAL_CATEGORY_VALUES = [
  "ORAL",
  "INJECTABLE",
  "TOPICAL",
  "INHALED",
  "OTHER",
] as const;

export type MedicationRouteClinicalCategory = (typeof MEDICATION_ROUTE_CLINICAL_CATEGORY_VALUES)[number];

export const medicationRouteClinicalCategorySchema = z.enum(MEDICATION_ROUTE_CLINICAL_CATEGORY_VALUES);

/**
 * Verified RxNorm mapping requires an explicit VERIFIED status **and** a non-empty RxCUI.
 * Default UNMAPPED must never be treated as verified.
 */
export function isRxNormVerifiedMapping(
  status: string | null | undefined,
  rxCui: string | null | undefined
): boolean {
  if (status?.trim().toUpperCase() !== "VERIFIED") return false;
  const cui = rxCui?.trim();
  return Boolean(cui);
}

/**
 * Phase 2 guardrail: canonical identity merges must never run automatically from fuzzy
 * name/strength similarity. All dual-layer and RxNorm linkages require explicit review
 * status transitions (CANDIDATE → VERIFIED) with provenance metadata.
 *
 * Call sites that propose auto-merge from search or string distance must throw or no-op
 * until a human or manifest-driven workflow sets status explicitly.
 */
export function assertNoAutomaticFuzzyMerge(context: string): never {
  throw new Error(
    `Automatic fuzzy medication identity merge is forbidden (${context}). ` +
      "Use explicit CANDIDATE status and manual or manifest verification."
  );
}

export type HistoricalMedicationIdentityInput = {
  snapshotLabel?: string | null;
  catalogCode?: string | null;
  currentCanonical?: {
    conceptDisplayName?: string | null;
    productStrengthDisplay?: string | null;
    productCode?: string | null;
  } | null;
};

export type ResolvedHistoricalMedicationIdentity = {
  primaryLabel: string;
  source: "snapshot" | "catalog_code" | "canonical";
  catalogCode: string | null;
};

/**
 * Resolves display identity for historical MAR/order rows: snapshot label wins when present,
 * then catalog code, then current canonical metadata.
 */
export function resolveHistoricalMedicationIdentity(
  input: HistoricalMedicationIdentityInput
): ResolvedHistoricalMedicationIdentity {
  const snapshot = input.snapshotLabel?.trim();
  if (snapshot) {
    return {
      primaryLabel: snapshot,
      source: "snapshot",
      catalogCode: input.catalogCode?.trim() || null,
    };
  }

  const code = input.catalogCode?.trim();
  if (code) {
    return {
      primaryLabel: code,
      source: "catalog_code",
      catalogCode: code,
    };
  }

  const canonical = input.currentCanonical;
  const canonicalLabel =
    [canonical?.conceptDisplayName, canonical?.productStrengthDisplay].filter(Boolean).join(" — ").trim() ||
    canonical?.productCode?.trim() ||
    "Medication (label unavailable)";

  return {
    primaryLabel: canonicalLabel,
    source: "canonical",
    catalogCode: null,
  };
}

export function isDualLayerVerifiedLinkage(status: string | null | undefined): boolean {
  return status?.trim().toUpperCase() === "VERIFIED";
}

/** Legacy FK present does not imply verified linkage — status must be explicit. */
export function hasLegacyCatalogLinkButUnverified(
  legacyCatalogMedicationId: string | null | undefined,
  dualLayerLinkageStatus: string | null | undefined
): boolean {
  return Boolean(legacyCatalogMedicationId?.trim()) && !isDualLayerVerifiedLinkage(dualLayerLinkageStatus);
}
