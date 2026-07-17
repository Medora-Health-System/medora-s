/**
 * Canonical identifier coverage — RxNorm, NDC, duplicates, orphans (read-only).
 */
import type { PrismaClient } from "@prisma/client";
import type { CatalogMetricsSnapshot } from "./medication-catalog-metrics";
import {
  auditBase,
  findDuplicateStrings,
  type AuditConfidence,
  type AuditDataSource,
} from "./medication-audit-types";

export function buildIdentifierCoverageArtifact(
  dataSource: AuditDataSource,
  confidence: AuditConfidence,
  metrics: CatalogMetricsSnapshot
) {
  return {
    ...auditBase(dataSource, confidence),
    coverage: {
      rxNormConceptIds: metrics.liveCounts.rxNormPopulated,
      catalogNdc11: metrics.liveCounts.ndcCatalog,
      packageNdc11: metrics.liveCounts.ndcPackage,
      catalogCodes: metrics.liveCounts.catalogMedication,
      canonicalConcepts: metrics.liveCounts.medicationConcept,
    },
    orphanCounters: metrics.orphanCounters,
    missingIdentifierCounters: metrics.missingIdentifierCounters,
    dualIdentityRisk: {
      cutoverSafe: false,
      catalogWithoutLegacyProduct: metrics.orphanCounters.catalogWithoutLegacyProduct,
      productWithoutLegacyCatalog: metrics.orphanCounters.productWithoutLegacyCatalog,
    },
    maturityScore: metrics.liveCounts.rxNormPopulated > 0 ? 3 : 2,
  };
}

export function buildRxNormReadinessArtifact(
  dataSource: AuditDataSource,
  confidence: AuditConfidence,
  metrics: CatalogMetricsSnapshot
) {
  const populated = metrics.liveCounts.rxNormPopulated;
  const totalConcepts = metrics.liveCounts.medicationConcept;
  return {
    ...auditBase(dataSource, confidence),
    rxNormPopulated: populated,
    totalConcepts,
    populationRate: totalConcepts > 0 ? populated / totalConcepts : 0,
    ready: populated > 0 && populated >= totalConcepts * 0.9,
    blockers: populated === 0 ? ["No rxNormConceptId values populated on MedicationConcept"] : [],
    recommendation: "Import RxNorm SCD/SBD core and backfill MedicationConcept.rxNormConceptId",
    maturityScore: populated > 0 ? 2 : 1,
  };
}

export function buildNdcReadinessArtifact(
  dataSource: AuditDataSource,
  confidence: AuditConfidence,
  metrics: CatalogMetricsSnapshot
) {
  const catalogWithNdc = metrics.liveCounts.ndcCatalog;
  const catalogTotal = metrics.liveCounts.catalogMedication;
  const packageWithNdc = metrics.liveCounts.ndcPackage;
  const packageTotal = metrics.liveCounts.medicationPackage;
  return {
    ...auditBase(dataSource, confidence),
    ndcCatalog: catalogWithNdc,
    ndcPackage: packageWithNdc,
    catalogCoverageRate: catalogTotal > 0 ? catalogWithNdc / catalogTotal : 0,
    packageCoverageRate: packageTotal > 0 ? packageWithNdc / packageTotal : 0,
    missingCatalogNdc: metrics.missingIdentifierCounters.catalogMissingNdc,
    missingPackageNdc: metrics.missingIdentifierCounters.packageMissingNdc,
    recommendation: "Link MedicationPackage.ndc11 to official NDC packages; avoid billing-only NDC on CatalogMedication",
    maturityScore: packageWithNdc > catalogWithNdc ? 2 : 1,
  };
}

export async function detectCatalogDuplicateGroups(prisma: PrismaClient | null) {
  if (!prisma) {
    return { duplicateGenericStrengthGroups: [] as string[], duplicateCodes: [] as string[] };
  }
  const rows = await prisma.catalogMedication.findMany({
    select: { code: true, genericName: true, strength: true, dosageForm: true, route: true },
  });
  const signatureCounts = new Map<string, number>();
  for (const row of rows) {
    const signature = [row.genericName, row.strength, row.dosageForm, row.route]
      .map((part) => (part ?? "").trim().toLowerCase())
      .join("|");
    if (!signature.replace(/\|/g, "")) continue;
    signatureCounts.set(signature, (signatureCounts.get(signature) ?? 0) + 1);
  }
  const duplicateGenericStrengthGroups = [...signatureCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([signature, count]) => `${signature} (${count})`)
    .sort()
    .slice(0, 50);

  const duplicateCodes = findDuplicateStrings(rows.map((row) => row.code));
  return { duplicateGenericStrengthGroups, duplicateCodes };
}

export function buildHcpcsAuditArtifact(
  dataSource: AuditDataSource,
  confidence: AuditConfidence,
  metrics: CatalogMetricsSnapshot
) {
  return {
    ...auditBase(dataSource, confidence),
    hcpcsCatalogRows: metrics.liveCounts.hcpcsCatalog,
    hcpcsBillingProfiles: metrics.liveCounts.hcpcsBilling,
    billingCatalogScope: "BillingCatalog triggerSource=MEDICATION system=HCPCS",
    billingProfileScope: "MedicationBillingProfile.hcpcsCodeSuggested",
    clinicalBillingSeparation: true,
    maturityScore: 2,
    gaps: ["Partial HCPCS mappings; billing codes not canonical clinical identity"],
  };
}
