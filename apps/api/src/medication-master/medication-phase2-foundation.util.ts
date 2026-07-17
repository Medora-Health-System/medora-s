import {
  classifyMedicationCode,
  isNonProductionDataClassification,
  type DualLayerLinkageStatus,
  type MedicationDataClassification,
  type RxNormMappingStatus,
} from "@medora/shared";

export type DualLayerLinkageAuditRow = {
  productId: string;
  productCode: string;
  legacyCatalogMedicationId: string | null;
  dualLayerLinkageStatus: DualLayerLinkageStatus;
  dualLayerLinkageMethod: string | null;
  dualLayerLinkageConfidence: string | null;
  hasLegacyFkButUnverified: boolean;
  dataClassification: MedicationDataClassification | null;
  catalogCode: string | null;
};

export function buildDualLayerLinkageAuditRow(input: {
  productId: string;
  productCode: string;
  legacyCatalogMedicationId?: string | null;
  dualLayerLinkageStatus?: string | null;
  dualLayerLinkageMethod?: string | null;
  dualLayerLinkageConfidence?: string | null;
  catalogCode?: string | null;
  dataClassification?: string | null;
}): DualLayerLinkageAuditRow {
  const status = (input.dualLayerLinkageStatus?.trim().toUpperCase() ?? "UNLINKED") as DualLayerLinkageStatus;
  const legacyId = input.legacyCatalogMedicationId?.trim() || null;
  const hasLegacyFkButUnverified = Boolean(legacyId) && status !== "VERIFIED";

  return {
    productId: input.productId,
    productCode: input.productCode,
    legacyCatalogMedicationId: legacyId,
    dualLayerLinkageStatus: status,
    dualLayerLinkageMethod: input.dualLayerLinkageMethod?.trim() || null,
    dualLayerLinkageConfidence: input.dualLayerLinkageConfidence?.trim() || null,
    hasLegacyFkButUnverified,
    catalogCode: input.catalogCode?.trim() || null,
    dataClassification:
      (input.dataClassification?.trim().toUpperCase() as MedicationDataClassification) ||
      (input.catalogCode ? classifyMedicationCode(input.catalogCode) : null),
  };
}

/**
 * Optional Phase 3 search hook — default excludes nothing.
 * Only filters FIXTURE/DEV_SAMPLE when excludeFixtures is explicitly true.
 */
export function shouldExcludeFromProductionSearch(input: {
  dataClassification?: string | null;
  code?: string | null;
  excludeFixtures?: boolean;
}): boolean {
  if (input.excludeFixtures !== true) return false;

  const stored = input.dataClassification?.trim().toUpperCase();
  if (stored && isNonProductionDataClassification(stored)) return true;

  const inferred = classifyMedicationCode(input.code);
  return isNonProductionDataClassification(inferred);
}

export function summarizeRxNormMappingAudit(input: {
  conceptId: string;
  rxNormConceptId?: string | null;
  rxNormMappingStatus?: RxNormMappingStatus | string | null;
}): { conceptId: string; verified: boolean; status: string } {
  const status = input.rxNormMappingStatus?.trim().toUpperCase() ?? "UNMAPPED";
  const verified = status === "VERIFIED" && Boolean(input.rxNormConceptId?.trim());
  return { conceptId: input.conceptId, verified, status };
}
