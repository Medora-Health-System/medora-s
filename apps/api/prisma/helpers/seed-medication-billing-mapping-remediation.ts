import type { PrismaClient } from "@prisma/client";
import { loadMedicationBillingMappingSeedModules } from "./medication-billing-seed-modules";

export type SeedMedicationBillingMappingRemediationResult = {
  manifestEntries: number;
  billingCatalogCreated: number;
  billingCatalogSkippedExisting: number;
  catalogBillingDefaultCreated: number;
  catalogBillingDefaultSkippedExisting: number;
  catalogNdcCreated: number;
  catalogNdcSkippedExisting: number;
  packageBillingProfileCreated: number;
  packageBillingProfileSkippedExisting: number;
  packageNdcCreated: number;
  packageNdcSkippedExisting: number;
  catalogNotFound: number;
  duplicateProtected: number;
};

/**
 * M1.4B — Idempotent medication billing mapping remediation.
 * Only fills missing BillingCatalog rows, billingCodeDefault, ndc11, and package billing profiles.
 */
export async function seedMedicationBillingMappingRemediation(
  prisma: PrismaClient
): Promise<SeedMedicationBillingMappingRemediationResult> {
  const {
    MEDICATION_BILLING_MAPPING_ENTRIES,
    MEDICATION_BILLING_MAPPING_BY_CODE,
    MEDICATION_BILLING_NDC_BY_CATALOG_CODE,
    assertMedicationBillingMappingManifest,
    resolveMedicationHcpcsForCatalogRow,
  } = await loadMedicationBillingMappingSeedModules();

  assertMedicationBillingMappingManifest();

  const result: SeedMedicationBillingMappingRemediationResult = {
    manifestEntries: MEDICATION_BILLING_MAPPING_ENTRIES.length,
    billingCatalogCreated: 0,
    billingCatalogSkippedExisting: 0,
    catalogBillingDefaultCreated: 0,
    catalogBillingDefaultSkippedExisting: 0,
    catalogNdcCreated: 0,
    catalogNdcSkippedExisting: 0,
    packageBillingProfileCreated: 0,
    packageBillingProfileSkippedExisting: 0,
    packageNdcCreated: 0,
    packageNdcSkippedExisting: 0,
    catalogNotFound: 0,
    duplicateProtected: 0,
  };

  const catalogRows = await prisma.catalogMedication.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      billingCodeDefault: true,
      ndc11: true,
      ndcDisplay: true,
      dosageForm: true,
      route: true,
      administrationType: true,
    },
  });
  const catalogByCode = new Map(catalogRows.map((r) => [r.code, r]));

  for (const entry of MEDICATION_BILLING_MAPPING_ENTRIES) {
    const catalog = catalogByCode.get(entry.catalogCode);
    if (!catalog) {
      result.catalogNotFound += 1;
      continue;
    }

    const existingCatalog = await prisma.billingCatalog.findFirst({
      where: { triggerSource: "MEDICATION", externalCode: entry.catalogCode },
    });
    if (existingCatalog) {
      result.billingCatalogSkippedExisting += 1;
      result.duplicateProtected += 1;
    } else {
      await prisma.billingCatalog.create({
        data: {
          code: entry.hcpcs,
          system: "HCPCS",
          description: entry.description.slice(0, 200),
          triggerSource: "MEDICATION",
          externalCode: entry.catalogCode,
          billClass: "both",
        },
      });
      result.billingCatalogCreated += 1;
    }

    const hcpcsTarget = resolveMedicationHcpcsForCatalogRow(catalog, MEDICATION_BILLING_MAPPING_BY_CODE);
    if (!catalog.billingCodeDefault?.trim() && hcpcsTarget) {
      await prisma.catalogMedication.update({
        where: { id: catalog.id },
        data: {
          billingCodeDefault: hcpcsTarget,
          ...(entry.billingUnitType ? { billingUnitType: entry.billingUnitType } : {}),
        },
      });
      result.catalogBillingDefaultCreated += 1;
    } else {
      result.catalogBillingDefaultSkippedExisting += 1;
      if (catalog.billingCodeDefault?.trim()) result.duplicateProtected += 1;
    }

    const ndcEntry = MEDICATION_BILLING_NDC_BY_CATALOG_CODE[entry.catalogCode];
    if (ndcEntry) {
      if (!catalog.ndc11?.trim()) {
        await prisma.catalogMedication.update({
          where: { id: catalog.id },
          data: { ndc11: ndcEntry.ndc11, ndcDisplay: ndcEntry.ndcDisplay },
        });
        result.catalogNdcCreated += 1;
      } else {
        result.catalogNdcSkippedExisting += 1;
        result.duplicateProtected += 1;
      }
    }

    const products = await prisma.medicationProduct.findMany({
      where: { legacyCatalogMedicationId: catalog.id },
      select: { id: true },
    });

    for (const product of products) {
      const defaultPackage = await prisma.medicationPackage.findFirst({
        where: { productId: product.id, isActive: true },
        orderBy: [{ isDefaultForProduct: "desc" }, { createdAt: "asc" }],
        select: {
          id: true,
          ndc11: true,
          billingProfiles: { select: { hcpcsCodeSuggested: true } },
        },
      });
      if (!defaultPackage) continue;

      const hasHcpcsProfile = defaultPackage.billingProfiles.some((p) =>
        p.hcpcsCodeSuggested?.trim()
      );
      if (!hasHcpcsProfile && hcpcsTarget) {
        await prisma.medicationBillingProfile.create({
          data: {
            packageId: defaultPackage.id,
            hcpcsCodeSuggested: hcpcsTarget,
            hcpcsUnitType: entry.billingUnitType ?? null,
            requiresManualReview: ndcEntry?.confidence === "review",
          },
        });
        result.packageBillingProfileCreated += 1;
      } else {
        result.packageBillingProfileSkippedExisting += 1;
        if (hasHcpcsProfile) result.duplicateProtected += 1;
      }

      if (ndcEntry && !defaultPackage.ndc11?.trim()) {
        await prisma.medicationPackage.update({
          where: { id: defaultPackage.id },
          data: { ndc11: ndcEntry.ndc11, ndcDisplay: ndcEntry.ndcDisplay },
        });
        result.packageNdcCreated += 1;
      } else if (ndcEntry) {
        result.packageNdcSkippedExisting += 1;
        if (defaultPackage.ndc11?.trim()) result.duplicateProtected += 1;
      }
    }
  }

  return result;
}
