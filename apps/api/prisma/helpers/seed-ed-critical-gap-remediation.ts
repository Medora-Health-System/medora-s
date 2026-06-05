import type { PrismaClient } from "@prisma/client";
import { MedicationMarWorkflow } from "@prisma/client";
import {
  ED_CATALOG_HARMONIZATION,
  ED_CLONIDINE_FORMULARY_ENTRIES,
  ED_CRITICAL_ALIAS_UPSERTS,
  ED_CRITICAL_GAP_REMEDIATION_VERSION,
  ED_LEGACY_ADMIN_TYPE_REMEDIATION,
  resolveEdLegacyAdminTypeRemediation,
  resolveEdProductAdministrationType,
} from "@medora/shared";

export type SeedEdCriticalGapRemediationOptions = {
  dryRun?: boolean;
};

export type SeedEdCriticalGapRemediationResult = {
  dryRun: boolean;
  version: string;
  clonidineProductsCreated: number;
  clonidinePackagesCreated: number;
  clonidineBillingProfilesCreated: number;
  catalogAdminTypesSynced: number;
  productAdminTypesSynced: number;
  criticalAliasesUpserted: number;
  harmonizationAliasesUpserted: number;
  searchTextUpdated: number;
  skippedMissingCatalog: number;
};

function normalizeAlias(alias: string): string {
  return alias.trim().toLowerCase();
}

function mergeSearchText(existing: string | null | undefined, tokens: string[]): string {
  const parts = (existing ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const seen = new Set(parts);
  for (const token of tokens) {
    const t = token.trim().toLowerCase();
    if (t.length < 2 || seen.has(t)) continue;
    seen.add(t);
    parts.push(t);
  }
  return parts.join(" ");
}

function conceptCodeForGeneric(genericName: string): string {
  return genericName
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

async function syncProductAdministrationType(
  prisma: PrismaClient,
  productId: string,
  adminType: string,
  dryRun: boolean
): Promise<void> {
  if (dryRun) return;
  await prisma.medicationProduct.update({
    where: { id: productId },
    data: { administrationType: adminType },
  });
  await prisma.medicationAdministrationProfile.upsert({
    where: { productId },
    create: {
      productId,
      defaultMarWorkflow:
        adminType === "INFUSION"
          ? MedicationMarWorkflow.INFUSION_SESSION
          : MedicationMarWorkflow.SINGLE_DOSE,
      requiresInfusionSession: adminType === "INFUSION",
    },
    update: {
      defaultMarWorkflow:
        adminType === "INFUSION"
          ? MedicationMarWorkflow.INFUSION_SESSION
          : MedicationMarWorkflow.SINGLE_DOSE,
      requiresInfusionSession: adminType === "INFUSION",
    },
  });
}

async function upsertCatalogAlias(
  prisma: PrismaClient,
  catalogId: string,
  alias: string,
  dryRun: boolean
): Promise<boolean> {
  const normalized = normalizeAlias(alias);
  if (normalized.length < 2) return false;
  if (dryRun) return true;
  const existing = await prisma.medicationAlias.findUnique({
    where: { catalogMedicationId_alias: { catalogMedicationId: catalogId, alias: normalized } },
  });
  if (existing) return false;
  await prisma.medicationAlias.create({
    data: { catalogMedicationId: catalogId, alias: normalized, language: "en" },
  });
  return true;
}

/**
 * M1.8B — Idempotent ED critical gap remediation seed.
 * Does not activate Wave 4, billing, order search, or MAR paths.
 */
export async function seedEdCriticalGapRemediation(
  prisma: PrismaClient,
  options: SeedEdCriticalGapRemediationOptions = {}
): Promise<SeedEdCriticalGapRemediationResult> {
  const dryRun = options.dryRun === true;
  const result: SeedEdCriticalGapRemediationResult = {
    dryRun,
    version: ED_CRITICAL_GAP_REMEDIATION_VERSION,
    clonidineProductsCreated: 0,
    clonidinePackagesCreated: 0,
    clonidineBillingProfilesCreated: 0,
    catalogAdminTypesSynced: 0,
    productAdminTypesSynced: 0,
    criticalAliasesUpserted: 0,
    harmonizationAliasesUpserted: 0,
    searchTextUpdated: 0,
    skippedMissingCatalog: 0,
  };

  for (const entry of ED_CLONIDINE_FORMULARY_ENTRIES) {
    const catalog = await prisma.catalogMedication.findUnique({
      where: { code: entry.catalogCode },
      select: { id: true, administrationType: true, searchText: true },
    });
    if (!catalog) {
      result.skippedMissingCatalog += 1;
      continue;
    }

    if (!dryRun) {
      const mergedSearch = mergeSearchText(catalog.searchText, [
        ...entry.searchTerms,
        ...entry.aliases,
        entry.genericName,
        entry.displayNameEn,
      ]);
      if (mergedSearch !== (catalog.searchText ?? "")) {
        await prisma.catalogMedication.update({
          where: { id: catalog.id },
          data: {
            searchText: mergedSearch,
            administrationType: entry.administrationType,
          },
        });
        result.searchTextUpdated += 1;
      } else if (catalog.administrationType !== entry.administrationType) {
        await prisma.catalogMedication.update({
          where: { id: catalog.id },
          data: { administrationType: entry.administrationType },
        });
      }
    }

    let product = await prisma.medicationProduct.findUnique({
      where: { code: entry.catalogCode },
      include: { packages: { include: { billingProfiles: true } } },
    });

    if (!product && !dryRun) {
      await prisma.medicationRoute.upsert({
        where: { code: "ORAL" },
        create: { code: "ORAL", label: "ORAL" },
        update: {},
      });
      const route = await prisma.medicationRoute.findUniqueOrThrow({ where: { code: "ORAL" } });
      const conceptCode = conceptCodeForGeneric(entry.genericName);
      let concept = await prisma.medicationConcept.findUnique({ where: { code: conceptCode } });
      if (!concept) {
        concept = await prisma.medicationConcept.create({
          data: {
            code: conceptCode,
            genericName: entry.genericName,
            displayName: entry.displayNameEn,
            isActive: false,
          },
        });
      }
      const concentration = await prisma.medicationConcentration.create({
        data: { displayText: entry.strength },
      });
      product = await prisma.medicationProduct.create({
        data: {
          code: entry.catalogCode,
          conceptId: concept.id,
          legacyCatalogMedicationId: catalog.id,
          strengthDisplay: entry.strength,
          concentrationId: concentration.id,
          dosageForm: entry.dosageForm,
          defaultRouteId: route.id,
          administrationType: entry.administrationType,
          billingClass: entry.billingClass,
          isActive: false,
          governanceStatus: "REVIEW_REQUIRED",
          baselineAvailable: false,
          governanceNotes: `[${ED_CRITICAL_GAP_REMEDIATION_VERSION}] clonidine gap remediation; inactive pending review`,
        },
        include: { packages: { include: { billingProfiles: true } } },
      });
      result.clonidineProductsCreated += 1;

      const pkg = await prisma.medicationPackage.create({
        data: {
          code: `${entry.catalogCode}_PKG`,
          productId: product.id,
          packageDescription: entry.displayNameFr,
          packageType: "TABLET",
          isDefaultForProduct: true,
          isActive: false,
        },
      });
      result.clonidinePackagesCreated += 1;

      await prisma.medicationBillingProfile.create({
        data: {
          packageId: pkg.id,
          requiresManualReview: true,
        },
      });
      result.clonidineBillingProfilesCreated += 1;

      await prisma.medicationAdministrationProfile.create({
        data: {
          productId: product.id,
          defaultMarWorkflow: MedicationMarWorkflow.SINGLE_DOSE,
          requiresInfusionSession: false,
        },
      });
    } else if (product && !dryRun) {
      const resolved = resolveEdProductAdministrationType(
        entry.catalogCode,
        entry.administrationType,
        product.administrationType
      );
      if (product.administrationType !== resolved) {
        await syncProductAdministrationType(prisma, product.id, resolved, dryRun);
        result.productAdminTypesSynced += 1;
      }
      if (!product.legacyCatalogMedicationId) {
        await prisma.medicationProduct.update({
          where: { id: product.id },
          data: { legacyCatalogMedicationId: catalog.id },
        });
      }
    }
  }

  for (const target of ED_LEGACY_ADMIN_TYPE_REMEDIATION) {
    const catalog = await prisma.catalogMedication.findUnique({
      where: { code: target.catalogCode },
      select: { id: true, administrationType: true },
    });
    if (!catalog) {
      result.skippedMissingCatalog += 1;
      continue;
    }

    const resolvedCatalog = resolveEdLegacyAdminTypeRemediation(
      target.catalogCode,
      catalog.administrationType
    );
    if (resolvedCatalog && catalog.administrationType !== resolvedCatalog && !dryRun) {
      await prisma.catalogMedication.update({
        where: { id: catalog.id },
        data: { administrationType: resolvedCatalog },
      });
      result.catalogAdminTypesSynced += 1;
    }

    const products = await prisma.medicationProduct.findMany({
      where: {
        OR: [{ code: target.catalogCode }, { legacyCatalogMedicationId: catalog.id }],
      },
      select: { id: true, administrationType: true, code: true },
    });

    for (const product of products) {
      const resolvedProduct = resolveEdProductAdministrationType(
        target.catalogCode,
        resolvedCatalog ?? catalog.administrationType,
        product.administrationType
      );
      if (product.administrationType !== resolvedProduct) {
        await syncProductAdministrationType(prisma, product.id, resolvedProduct, dryRun);
        result.productAdminTypesSynced += 1;
      }
    }
  }

  for (const upsert of ED_CRITICAL_ALIAS_UPSERTS) {
    const catalog = await prisma.catalogMedication.findUnique({
      where: { code: upsert.catalogCode },
      select: { id: true, searchText: true },
    });
    if (!catalog) {
      result.skippedMissingCatalog += 1;
      continue;
    }
    for (const alias of upsert.aliases) {
      if (await upsertCatalogAlias(prisma, catalog.id, alias, dryRun)) {
        result.criticalAliasesUpserted += 1;
      }
    }
    if (!dryRun) {
      const merged = mergeSearchText(catalog.searchText, [...upsert.aliases]);
      if (merged !== (catalog.searchText ?? "")) {
        await prisma.catalogMedication.update({
          where: { id: catalog.id },
          data: { searchText: merged },
        });
        result.searchTextUpdated += 1;
      }
    }
  }

  for (const harmonization of ED_CATALOG_HARMONIZATION) {
    const catalog = await prisma.catalogMedication.findUnique({
      where: { code: harmonization.canonicalCatalogCode },
      select: { id: true, searchText: true },
    });
    if (!catalog) {
      result.skippedMissingCatalog += 1;
      continue;
    }
    for (const alias of harmonization.crossSearchAliases) {
      if (await upsertCatalogAlias(prisma, catalog.id, alias, dryRun)) {
        result.harmonizationAliasesUpserted += 1;
      }
    }
    if (!dryRun) {
      const merged = mergeSearchText(catalog.searchText, [...harmonization.crossSearchAliases]);
      if (merged !== (catalog.searchText ?? "")) {
        await prisma.catalogMedication.update({
          where: { id: catalog.id },
          data: { searchText: merged },
        });
        result.searchTextUpdated += 1;
      }
    }
  }

  return result;
}
