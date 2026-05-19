import type { Prisma } from "@prisma/client";

/**
 * Shared Prisma select for staging rows used in promotion eligibility and list APIs.
 * Keeps `sourceInventorySku` (nullable) in sync across queries, mocks, and mappers.
 */
export const medicationFormularyImportStagingPromotionSelect = {
  id: true,
  facilityId: true,
  batchId: true,
  sourceRowId: true,
  sourceInventorySku: true,
  sourceInventoryDescription: true,
  rawJson: true,
  proposedConceptCode: true,
  proposedProductCode: true,
  proposedPackageCode: true,
  reconciliationStatus: true,
  importGateStatus: true,
  overallStatus: true,
  reviewFlags: true,
  ndc11: true,
  hcpcsCodeSuggested: true,
  billingReviewStatus: true,
  safetyReviewStatus: true,
  infusionReviewStatus: true,
  pharmacySignoff: true,
  nursingSignoff: true,
  edMdSignoff: true,
  complianceSignoff: true,
  validationErrors: true,
  importedAt: true,
  importedByUserId: true,
  promotionResultJson: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MedicationFormularyImportStagingSelect;

export type MedicationFormularyImportStagingPromotionRow =
  Prisma.MedicationFormularyImportStagingGetPayload<{
    select: typeof medicationFormularyImportStagingPromotionSelect;
  }>;

/** Minimal fixture shape for tests (all promotion fields, SKU nullable). */
export function medicationFormularyImportStagingPromotionFixture(
  overrides: Partial<MedicationFormularyImportStagingPromotionRow> = {}
): MedicationFormularyImportStagingPromotionRow {
  return {
    id: "st-fixture-1",
    facilityId: "fac-1",
    batchId: "batch-fixture",
    sourceRowId: "PRI_ER_FIXTURE_1",
    sourceInventorySku: null,
    sourceInventoryDescription: "Fixture medication 10mg Tablet",
    rawJson: {
      __preservation: { phase: "19E.1", rule: "priority_er_inventory_exact_source" },
      __sourceTrace: {
        exactSourceText: "Fixture medication 10mg Tablet",
        sourceNameExact: "Fixture medication",
        sourceStrengthExact: "10mg",
        sourceRouteExact: "Tablet",
        sourcePackageExact: "Tablet",
        sourceReviewStatus: "MANUAL_REVIEW_REQUIRED",
      },
    },
    proposedConceptCode: null,
    proposedProductCode: null,
    proposedPackageCode: null,
    reconciliationStatus: "NEW_CANDIDATE",
    importGateStatus: "BLOCKED",
    overallStatus: "draft",
    reviewFlags: ["MANUAL_REVIEW_REQUIRED"],
    ndc11: null,
    hcpcsCodeSuggested: null,
    billingReviewStatus: null,
    safetyReviewStatus: null,
    infusionReviewStatus: null,
    pharmacySignoff: null,
    nursingSignoff: null,
    edMdSignoff: null,
    complianceSignoff: null,
    validationErrors: null,
    importedAt: new Date(),
    importedByUserId: "user-fixture",
    promotionResultJson: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
