/**
 * MEDUI.MEDICATION.MAR_PAIN_RESPONSE_AND_ENTERPRISE_SEED_ENGINE.1
 * Generic enterprise medication manifest seed engine — catalog, aliases, billing, optional products.
 */
import type { PrismaClient } from "@prisma/client";
import { getActiveProviderOrderableCatalogCodes, prewarmProviderOrderableCatalogCodesRegistry } from "@medora/shared";
import {
  mergeManifestSearchText,
  normalizeManifestAlias,
  resolveEnterpriseSeedCatalogIsActive,
  safeManifestMapLookup,
} from "./seed-enterprise-medication-manifest.utils";

export {
  mergeManifestSearchText,
  normalizeManifestAlias,
  resolveEnterpriseSeedCatalogIsActive,
  safeManifestMapLookup,
} from "./seed-enterprise-medication-manifest.utils";

export type EnterpriseManifestCatalogSeedBody = {
  name: string;
  genericName: string;
  displayNameFr: string;
  displayNameEn: string;
  strength: string | null;
  dosageForm: string | null;
  route: string | null;
  therapeuticClass: string;
  administrationType: string;
  billingClass: string;
  sortPriority: number;
  isEssential: boolean;
  isActive: boolean;
  isControlled: boolean;
  controlledSchedule: string | null;
  requiresWitness: boolean;
  requiresDoubleSign: boolean;
  searchText: string;
  ndc11: string | null;
  ndcDisplay: string | null;
  billingCodeDefault: string | null;
  billingUnitType: string | null;
};

export type EnterpriseManifestBillingSpec = {
  hcpcs?: string | null;
  ndc11?: string | null;
  ndcDisplay?: string | null;
  billingUnitType?: string | null;
};

export type EnterpriseManifestAliasSpec = {
  text: string;
  language: "en" | "fr";
};

export type EnterpriseManifestSeedResolveResult =
  | {
      ok: true;
      catalogCode: string;
      body: EnterpriseManifestCatalogSeedBody;
      aliases: EnterpriseManifestAliasSpec[];
      billingSourcePresent: boolean;
    }
  | { ok: false; catalogCode: string; reason: string };

export type EnterpriseMedicationManifestSeedProfile = {
  domain: string;
  catalogCodes: readonly string[];
  resolve: (catalogCode: string) => EnterpriseManifestSeedResolveResult;
  mergeSearchText?: "replace" | "additive";
  createProducts?: boolean;
};

export type EnterpriseMedicationManifestSeedOptions = {
  dryRun?: boolean;
  activeRegistry?: ReadonlySet<string>;
  createProducts?: boolean;
};

export type EnterpriseMedicationManifestSeedResult = {
  dryRun: boolean;
  domain: string;
  catalogCodes: number;
  catalogCreated: number;
  catalogEnriched: number;
  aliasesUpserted: number;
  aliasesUnchanged: number;
  searchTextUpdated: number;
  productsCreated: number;
  billingFieldsUpdated: number;
  skippedRows: Array<{ catalogCode: string; reason: string }>;
};

export function buildActiveProviderOrderableRegistryForSeed(): ReadonlySet<string> {
  prewarmProviderOrderableCatalogCodesRegistry();
  return getActiveProviderOrderableCatalogCodes();
}

async function upsertManifestAliases(
  prisma: PrismaClient,
  catalogId: string,
  aliases: EnterpriseManifestAliasSpec[],
  dryRun: boolean
): Promise<{ upserted: number; unchanged: number }> {
  let upserted = 0;
  let unchanged = 0;
  for (const alias of aliases) {
    const normalized = normalizeManifestAlias(alias.text);
    if (!normalized) continue;
    if (dryRun) {
      upserted += 1;
      continue;
    }
    const existing = await prisma.medicationAlias.findUnique({
      where: {
        catalogMedicationId_alias: {
          catalogMedicationId: catalogId,
          alias: alias.text.trim(),
        },
      },
    });
    if (existing) {
      unchanged += 1;
      continue;
    }
    await prisma.medicationAlias.create({
      data: {
        catalogMedicationId: catalogId,
        alias: alias.text.trim(),
        language: alias.language,
      },
    });
    upserted += 1;
  }
  return { upserted, unchanged };
}

async function ensureManifestMedicationProduct(
  prisma: PrismaClient,
  params: {
    catalogId: string;
    catalogCode: string;
    body: EnterpriseManifestCatalogSeedBody;
    dryRun: boolean;
  }
): Promise<boolean> {
  if (!params.body.ndc11?.trim()) return false;
  if (params.dryRun) return true;

  const existing = await prisma.medicationProduct.findFirst({
    where: { legacyCatalogMedicationId: params.catalogId },
    select: { id: true },
  });
  if (existing) return false;

  const routeCode = params.body.route?.trim() || "UNKNOWN";
  const route = await prisma.medicationRoute.upsert({
    where: { code: routeCode },
    create: { code: routeCode, name: routeCode },
    update: {},
  });

  const conceptCode = `${params.catalogCode}_CONCEPT`.slice(0, 120);
  let concept = await prisma.medicationConcept.findUnique({ where: { code: conceptCode } });
  if (!concept) {
    concept = await prisma.medicationConcept.create({
      data: {
        code: conceptCode,
        genericName: params.body.genericName,
        displayName: params.body.displayNameEn,
        isActive: false,
      },
    });
  }

  const concentration = await prisma.medicationConcentration.create({
    data: { displayText: params.body.strength ?? params.body.genericName },
  });

  const product = await prisma.medicationProduct.create({
    data: {
      code: params.catalogCode,
      conceptId: concept.id,
      legacyCatalogMedicationId: params.catalogId,
      strengthDisplay: params.body.strength,
      concentrationId: concentration.id,
      dosageForm: params.body.dosageForm ?? "unknown",
      defaultRouteId: route.id,
      administrationType: params.body.administrationType,
      billingClass: params.body.billingClass,
      isActive: false,
      governanceStatus: "REVIEW_REQUIRED",
      baselineAvailable: false,
    },
  });

  const pkg = await prisma.medicationPackage.create({
    data: {
      code: `${params.catalogCode}_PKG`.slice(0, 120),
      productId: product.id,
      packageDescription: params.body.displayNameFr,
      packageType: "UNIT",
      ndc11: params.body.ndc11,
      ndcDisplay: params.body.ndcDisplay,
      isDefaultForProduct: true,
      isActive: false,
    },
  });

  if (params.body.billingCodeDefault?.trim()) {
    await prisma.medicationBillingProfile.create({
      data: {
        packageId: pkg.id,
        hcpcsCodeSuggested: params.body.billingCodeDefault,
        hcpcsUnitType: params.body.billingUnitType,
        requiresManualReview: true,
      },
    });
  }

  return true;
}

export async function seedEnterpriseMedicationManifestProfile(
  prisma: PrismaClient,
  profile: EnterpriseMedicationManifestSeedProfile,
  options: EnterpriseMedicationManifestSeedOptions = {}
): Promise<EnterpriseMedicationManifestSeedResult> {
  const dryRun = options.dryRun === true;
  const activeRegistry = options.activeRegistry ?? buildActiveProviderOrderableRegistryForSeed();
  const mergeMode = profile.mergeSearchText ?? "additive";
  const createProducts = options.createProducts ?? profile.createProducts ?? false;

  const result: EnterpriseMedicationManifestSeedResult = {
    dryRun,
    domain: profile.domain,
    catalogCodes: profile.catalogCodes.length,
    catalogCreated: 0,
    catalogEnriched: 0,
    aliasesUpserted: 0,
    aliasesUnchanged: 0,
    searchTextUpdated: 0,
    productsCreated: 0,
    billingFieldsUpdated: 0,
    skippedRows: [],
  };

  for (const catalogCode of profile.catalogCodes) {
    const resolved = profile.resolve(catalogCode.trim());
    if (!resolved.ok) {
      result.skippedRows.push({ catalogCode: resolved.catalogCode, reason: resolved.reason });
      continue;
    }

    const existing = dryRun
      ? null
      : await prisma.catalogMedication.findUnique({
          where: { code: resolved.catalogCode },
          select: { id: true, searchText: true, isActive: true },
        });

    const isActive = resolveEnterpriseSeedCatalogIsActive(
      resolved.catalogCode,
      activeRegistry,
      existing?.isActive
    );
    const searchText = mergeManifestSearchText(
      existing?.searchText,
      resolved.body.searchText.split(/\s+/).filter(Boolean),
      existing ? mergeMode : "replace"
    );
    const body = { ...resolved.body, isActive, searchText };

    if (dryRun) {
      if (existing) result.catalogEnriched += 1;
      else result.catalogCreated += 1;
      result.aliasesUpserted += resolved.aliases.length;
      if (createProducts && body.ndc11?.trim()) result.productsCreated += 1;
      continue;
    }

    let catalogId: string;
    if (existing) {
      await prisma.catalogMedication.update({
        where: { id: existing.id },
        data: body,
      });
      catalogId = existing.id;
      result.catalogEnriched += 1;
      if (searchText !== (existing.searchText ?? "")) result.searchTextUpdated += 1;
    } else {
      const created = await prisma.catalogMedication.create({ data: { code: resolved.catalogCode, ...body } });
      catalogId = created.id;
      result.catalogCreated += 1;
      result.searchTextUpdated += 1;
    }

    if (body.billingCodeDefault?.trim() || body.ndc11?.trim()) {
      result.billingFieldsUpdated += 1;
    }

    const aliasStats = await upsertManifestAliases(prisma, catalogId, resolved.aliases, dryRun);
    result.aliasesUpserted += aliasStats.upserted;
    result.aliasesUnchanged += aliasStats.unchanged;

    if (createProducts) {
      const created = await ensureManifestMedicationProduct(prisma, {
        catalogId,
        catalogCode: resolved.catalogCode,
        body,
        dryRun,
      });
      if (created) result.productsCreated += 1;
    }
  }

  return result;
}
