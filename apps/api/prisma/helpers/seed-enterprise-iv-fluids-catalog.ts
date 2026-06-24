import type { PrismaClient } from "@prisma/client";
import {
  ENTERPRISE_IV_FLUIDS_FORMULARY_BY_CODE,
  ENTERPRISE_IV_FLUIDS_SEARCH_ALIAS_BY_CODE,
  ENTERPRISE_IV_FLUIDS_SEARCH_ALIAS_MANIFEST,
  buildUnifiedOrderabilityMap,
  listActiveIvFluidsProviderOrderingCatalogCodes,
} from "@medora/shared";

export type SeedEnterpriseIvFluidsCatalogOptions = {
  dryRun?: boolean;
};

export type SeedEnterpriseIvFluidsCatalogResult = {
  dryRun: boolean;
  activatedCatalogCodes: number;
  catalogCreated: number;
  catalogEnriched: number;
  aliasesUpserted: number;
  aliasesUnchanged: number;
  searchTextUpdated: number;
  skippedMissingSharedArtifact: number;
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

function resolveSeedBody(catalogCode: string) {
  const formulary = ENTERPRISE_IV_FLUIDS_FORMULARY_BY_CODE[catalogCode];
  const orderability = buildUnifiedOrderabilityMap().get(catalogCode);
  const aliasEntry = ENTERPRISE_IV_FLUIDS_SEARCH_ALIAS_BY_CODE[catalogCode];
  if (!formulary && !orderability) return null;

  const displayNameEn = aliasEntry?.displayHint ?? formulary?.displayNameEn ?? orderability?.displayNameEn ?? catalogCode;
  const displayNameFr = formulary?.displayNameFr ?? orderability?.displayNameFr ?? displayNameEn;
  const genericName = formulary?.genericName ?? orderability?.genericName ?? displayNameEn;
  const searchTokens = [
    ...(aliasEntry?.aliases ?? []),
    ...(aliasEntry?.searchTerms ?? []),
    ...(formulary?.searchTerms ?? []),
    displayNameEn,
    displayNameFr,
    genericName,
    catalogCode,
  ];

  return {
    name: displayNameFr || genericName,
    genericName,
    displayNameFr,
    displayNameEn,
    strength: formulary?.strength ?? orderability?.strength ?? null,
    dosageForm: formulary?.dosageForm ?? orderability?.dosageForm ?? null,
    route: formulary?.route ?? orderability?.route ?? null,
    therapeuticClass: formulary?.therapeuticClass ?? orderability?.therapeuticClass ?? "Soluté",
    administrationType: formulary?.administrationType ?? "INFUSION",
    billingClass: formulary?.billingClass ?? "HYDRATION",
    sortPriority: 0,
    isEssential: true,
    isActive: true,
    isControlled: false,
    controlledSchedule: null,
    requiresWitness: false,
    requiresDoubleSign: false,
    searchText: mergeSearchText("", searchTokens),
  };
}

/**
 * MEDUI.MEDICATION.IV_FLUIDS_RUNTIME_SEARCH_AND_DB_BACKFILL.1
 * Backfill activated IV fluid catalog rows and clinical search aliases for provider search.
 */
export async function seedEnterpriseIvFluidsCatalog(
  prisma: PrismaClient,
  options: SeedEnterpriseIvFluidsCatalogOptions = {}
): Promise<SeedEnterpriseIvFluidsCatalogResult> {
  const dryRun = options.dryRun === true;
  const result: SeedEnterpriseIvFluidsCatalogResult = {
    dryRun,
    activatedCatalogCodes: 0,
    catalogCreated: 0,
    catalogEnriched: 0,
    aliasesUpserted: 0,
    aliasesUnchanged: 0,
    searchTextUpdated: 0,
    skippedMissingSharedArtifact: 0,
  };

  const activatedCodes = listActiveIvFluidsProviderOrderingCatalogCodes();
  result.activatedCatalogCodes = activatedCodes.length;

  for (const catalogCode of activatedCodes) {
    const body = resolveSeedBody(catalogCode);
    if (!body) {
      result.skippedMissingSharedArtifact += 1;
      continue;
    }

    const existing = await prisma.catalogMedication.findUnique({
      where: { code: catalogCode },
      select: { id: true, searchText: true },
    });

    if (!existing) {
      if (!dryRun) {
        await prisma.catalogMedication.create({
          data: { code: catalogCode, ...body },
        });
      }
      result.catalogCreated += 1;
    } else {
      if (!dryRun) {
        await prisma.catalogMedication.update({
          where: { code: catalogCode },
          data: {
            name: body.name,
            genericName: body.genericName,
            displayNameFr: body.displayNameFr,
            displayNameEn: body.displayNameEn,
            strength: body.strength,
            dosageForm: body.dosageForm,
            route: body.route,
            therapeuticClass: body.therapeuticClass,
            administrationType: body.administrationType,
            billingClass: body.billingClass,
            isEssential: body.isEssential,
            searchText: mergeSearchText(existing.searchText, body.searchText.split(/\s+/)),
          },
        });
      }
      result.catalogEnriched += 1;
      if (mergeSearchText(existing.searchText, body.searchText.split(/\s+/)) !== mergeSearchText(existing.searchText, [])) {
        result.searchTextUpdated += 1;
      }
    }
  }

  for (const aliasEntry of ENTERPRISE_IV_FLUIDS_SEARCH_ALIAS_MANIFEST) {
    const catalogCode = aliasEntry.catalogCode;
    const catalog = await prisma.catalogMedication.findUnique({
      where: { code: catalogCode },
      select: { id: true, searchText: true },
    });
    if (!catalog) continue;

    const aliasTexts = [...new Set([...aliasEntry.aliases, ...aliasEntry.searchTerms].map(normalizeAlias))];
    if (!dryRun) {
      const mergedSearchText = mergeSearchText(catalog.searchText, aliasTexts);
      if (mergedSearchText !== mergeSearchText(catalog.searchText, [])) {
        await prisma.catalogMedication.update({
          where: { id: catalog.id },
          data: { searchText: mergedSearchText },
        });
        result.searchTextUpdated += 1;
      }
      for (const alias of aliasTexts) {
        const found = await prisma.medicationAlias.findUnique({
          where: {
            catalogMedicationId_alias: { catalogMedicationId: catalog.id, alias },
          },
        });
        if (found) {
          result.aliasesUnchanged += 1;
          continue;
        }
        await prisma.medicationAlias.create({
          data: {
            catalogMedicationId: catalog.id,
            alias,
            language: "en",
          },
        });
        result.aliasesUpserted += 1;
      }
    } else {
      result.aliasesUpserted += aliasTexts.length;
    }
  }

  return result;
}
