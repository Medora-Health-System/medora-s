/**
 * Live DB + seed-file medication catalog metrics (release-agnostic, read-only).
 */
import type { PrismaClient } from "@prisma/client";
import { HAITI_MEDICATION_CATALOG } from "../../data/haiti-medications";
import { HAITI_MEDICATION_CATALOG_FULL } from "../../data/haiti-medication-catalog-full";
import {
  auditBase,
  classifyProductionVsFixture,
  type AuditConfidence,
  type AuditDataSource,
  type MedicationAuditBase,
} from "./medication-audit-types";

export type CatalogLiveCounts = {
  catalogMedication: number;
  catalogMedicationActive: number;
  medicationConcept: number;
  medicationProduct: number;
  medicationPackage: number;
  rxNormPopulated: number;
  ndcCatalog: number;
  ndcPackage: number;
  hcpcsCatalog: number;
  hcpcsBilling: number;
  medicationAlias: number;
  medicationSearchAlias: number;
  controlledCatalog: number;
  displayNameEnPopulated: number;
  displayNameFrPopulated: number;
  inventoryItem: number;
  formularyItem: number;
  safetyProfile: number;
  medicationAdministration: number;
  orderMedicationItems: number;
  importStagingRows: number;
};

export type SeedFileCounts = {
  haitiMedicationCatalog: number;
  haitiMedicationCatalogFull: number;
  haitiActive: number;
  haitiInactive: number;
};

export type CatalogMetricsSnapshot = MedicationAuditBase & {
  liveCounts: CatalogLiveCounts;
  seedFileCounts: SeedFileCounts;
  fixturePollution: {
    productionLike: number;
    fixtureLike: number;
    fixtureExamples: string[];
  };
  orphanCounters: {
    catalogWithoutLegacyProduct: number;
    productWithoutLegacyCatalog: number;
    conceptWithoutProduct: number;
    packageWithoutProduct: number;
    catalogWithoutDisplayEn: number;
    catalogWithoutDisplayFr: number;
  };
  missingIdentifierCounters: {
    catalogMissingNdc: number;
    packageMissingNdc: number;
    conceptMissingRxNorm: number;
    productMissingConcentration: number;
  };
  notes: string[];
};

export function collectSeedFileCounts(): SeedFileCounts {
  return {
    haitiMedicationCatalog: HAITI_MEDICATION_CATALOG.length,
    haitiMedicationCatalogFull: HAITI_MEDICATION_CATALOG_FULL.length,
    haitiActive: HAITI_MEDICATION_CATALOG.filter((row) => row.isActive).length,
    haitiInactive: HAITI_MEDICATION_CATALOG.filter((row) => !row.isActive).length,
  };
}

export async function collectLiveDbCounts(prisma: PrismaClient): Promise<CatalogLiveCounts> {
  const [
    catalogMedication,
    catalogMedicationActive,
    medicationConcept,
    medicationProduct,
    medicationPackage,
    rxNormPopulated,
    ndcCatalog,
    ndcPackage,
    hcpcsCatalog,
    hcpcsBilling,
    medicationAlias,
    medicationSearchAlias,
    controlledCatalog,
    displayNameEnPopulated,
    displayNameFrPopulated,
    inventoryItem,
    formularyItem,
    safetyProfile,
    medicationAdministration,
    orderMedicationItems,
    importStagingRows,
  ] = await Promise.all([
    prisma.catalogMedication.count(),
    prisma.catalogMedication.count({ where: { isActive: true } }),
    prisma.medicationConcept.count(),
    prisma.medicationProduct.count(),
    prisma.medicationPackage.count(),
    prisma.medicationConcept.count({ where: { rxNormConceptId: { not: null } } }),
    prisma.catalogMedication.count({ where: { ndc11: { not: null } } }),
    prisma.medicationPackage.count({ where: { ndc11: { not: null } } }),
    prisma.billingCatalog.count({ where: { triggerSource: "MEDICATION", system: "HCPCS" } }),
    prisma.medicationBillingProfile.count({ where: { hcpcsCodeSuggested: { not: null } } }),
    prisma.medicationAlias.count(),
    prisma.medicationSearchAlias.count(),
    prisma.catalogMedication.count({ where: { isControlled: true } }),
    prisma.catalogMedication.count({ where: { displayNameEn: { not: null } } }),
    prisma.catalogMedication.count({ where: { displayNameFr: { not: null } } }),
    prisma.inventoryItem.count(),
    prisma.facilityFormularyItem.count(),
    prisma.medicationSafetyProfile.count(),
    prisma.medicationAdministration.count(),
    prisma.orderItem.count({ where: { catalogItemType: "MEDICATION" } }),
    prisma.medicationFormularyImportStaging.count(),
  ]);

  return {
    catalogMedication,
    catalogMedicationActive,
    medicationConcept,
    medicationProduct,
    medicationPackage,
    rxNormPopulated,
    ndcCatalog,
    ndcPackage,
    hcpcsCatalog,
    hcpcsBilling,
    medicationAlias,
    medicationSearchAlias,
    controlledCatalog,
    displayNameEnPopulated,
    displayNameFrPopulated,
    inventoryItem,
    formularyItem,
    safetyProfile,
    medicationAdministration,
    orderMedicationItems,
    importStagingRows,
  };
}

export async function collectOrphanAndMissingCounters(prisma: PrismaClient) {
  const [
    catalogWithoutLegacyProduct,
    productWithoutLegacyCatalog,
    conceptWithoutProduct,
    catalogWithoutDisplayEn,
    catalogWithoutDisplayFr,
    catalogMissingNdc,
    packageMissingNdc,
    conceptMissingRxNorm,
    productMissingConcentration,
    catalogCodes,
    productIdsWithPackages,
    allProductIds,
  ] = await Promise.all([
    prisma.catalogMedication.count({ where: { legacyMedicationProducts: null } }),
    prisma.medicationProduct.count({ where: { legacyCatalogMedicationId: null } }),
    prisma.medicationConcept.count({ where: { products: { none: {} } } }),
    prisma.catalogMedication.count({
      where: { OR: [{ displayNameEn: null }, { displayNameEn: "" }] },
    }),
    prisma.catalogMedication.count({
      where: { OR: [{ displayNameFr: null }, { displayNameFr: "" }] },
    }),
    prisma.catalogMedication.count({ where: { ndc11: null } }),
    prisma.medicationPackage.count({ where: { ndc11: null } }),
    prisma.medicationConcept.count({ where: { rxNormConceptId: null } }),
    prisma.medicationProduct.count({ where: { concentrationId: null } }),
    prisma.catalogMedication.findMany({ select: { code: true } }),
    prisma.medicationPackage.findMany({ select: { productId: true }, distinct: ["productId"] }),
    prisma.medicationProduct.findMany({ select: { id: true } }),
  ]);

  const productIdSet = new Set(allProductIds.map((row) => row.id));
  const packageWithoutProduct = productIdsWithPackages.filter((row) => !productIdSet.has(row.productId)).length;

  return {
    orphanCounters: {
      catalogWithoutLegacyProduct,
      productWithoutLegacyCatalog,
      conceptWithoutProduct,
      packageWithoutProduct,
    },
    missingIdentifierCounters: {
      catalogMissingNdc,
      packageMissingNdc,
      conceptMissingRxNorm,
      productMissingConcentration,
    },
    catalogWithoutDisplayEn,
    catalogWithoutDisplayFr,
    fixturePollution: classifyProductionVsFixture(catalogCodes.map((row) => row.code)),
  };
}

function seedFallbackLiveCounts(seed: SeedFileCounts): CatalogLiveCounts {
  const full = seed.haitiMedicationCatalogFull;
  return {
    catalogMedication: full,
    catalogMedicationActive: seed.haitiActive,
    medicationConcept: 0,
    medicationProduct: 0,
    medicationPackage: 0,
    rxNormPopulated: 0,
    ndcCatalog: 0,
    ndcPackage: 0,
    hcpcsCatalog: 0,
    hcpcsBilling: 0,
    medicationAlias: 0,
    medicationSearchAlias: 0,
    controlledCatalog: HAITI_MEDICATION_CATALOG.filter((row) => row.isControlled).length,
    displayNameEnPopulated: HAITI_MEDICATION_CATALOG.filter((row) => Boolean(row.displayNameEn?.trim())).length,
    displayNameFrPopulated: HAITI_MEDICATION_CATALOG.filter((row) => Boolean(row.displayNameFr?.trim())).length,
    inventoryItem: 0,
    formularyItem: 0,
    safetyProfile: 0,
    medicationAdministration: 0,
    orderMedicationItems: 0,
    importStagingRows: 0,
  };
}

export async function buildCatalogMetricsSnapshot(
  prisma: PrismaClient | null,
  opts: { dataSource: AuditDataSource; confidence: AuditConfidence; dbError?: string }
): Promise<CatalogMetricsSnapshot> {
  const seedFileCounts = collectSeedFileCounts();
  const notes: string[] = [];
  if (opts.dbError) notes.push(`Database unavailable: ${opts.dbError}`);

  let liveCounts: CatalogLiveCounts;
  let orphanCounters: CatalogMetricsSnapshot["orphanCounters"];
  let missingIdentifierCounters: CatalogMetricsSnapshot["missingIdentifierCounters"];
  let fixturePollution: CatalogMetricsSnapshot["fixturePollution"];

  if (prisma) {
    liveCounts = await collectLiveDbCounts(prisma);
    const orphanData = await collectOrphanAndMissingCounters(prisma);
    orphanCounters = {
      ...orphanData.orphanCounters,
      catalogWithoutDisplayEn: orphanData.catalogWithoutDisplayEn,
      catalogWithoutDisplayFr: orphanData.catalogWithoutDisplayFr,
    };
    missingIdentifierCounters = orphanData.missingIdentifierCounters;
    fixturePollution = orphanData.fixturePollution;
  } else {
    liveCounts = seedFallbackLiveCounts(seedFileCounts);
    const haitiCodes = HAITI_MEDICATION_CATALOG_FULL.map((row) => row.code ?? "").filter(Boolean);
    fixturePollution = classifyProductionVsFixture(haitiCodes);
    orphanCounters = {
      catalogWithoutLegacyProduct: seedFileCounts.haitiMedicationCatalogFull,
      productWithoutLegacyCatalog: 0,
      conceptWithoutProduct: 0,
      packageWithoutProduct: 0,
      catalogWithoutDisplayEn: seedFileCounts.haitiMedicationCatalogFull - liveCounts.displayNameEnPopulated,
      catalogWithoutDisplayFr: seedFileCounts.haitiMedicationCatalogFull - liveCounts.displayNameFrPopulated,
    };
    missingIdentifierCounters = {
      catalogMissingNdc: seedFileCounts.haitiMedicationCatalogFull,
      packageMissingNdc: 0,
      conceptMissingRxNorm: 0,
      productMissingConcentration: 0,
    };
    notes.push("Orphan and NDC counters derived from Haiti seed files only.");
  }

  return {
    ...auditBase(opts.dataSource, opts.confidence),
    liveCounts,
    seedFileCounts,
    fixturePollution,
    orphanCounters,
    missingIdentifierCounters,
    notes,
  };
}

export function buildCatalogInventoryArtifact(metrics: CatalogMetricsSnapshot) {
  return {
    ...metrics,
    summary: {
      dualIdentityCutoverSafe: false,
      rxNormReady: metrics.liveCounts.rxNormPopulated > 0,
      enterpriseScaleProven: metrics.liveCounts.catalogMedication >= 10000,
      haitiSeedParityExpected: metrics.seedFileCounts.haitiMedicationCatalogFull,
    },
  };
}
