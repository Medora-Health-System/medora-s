import type { PrismaClient } from "@prisma/client";
import {
  ENTERPRISE_IV_FLUIDS_BILLING_BY_CODE,
  ENTERPRISE_IV_FLUIDS_FORMULARY_BY_CODE,
  ENTERPRISE_IV_FLUIDS_SEARCH_ALIAS_BY_CODE,
  ENTERPRISE_IV_FLUIDS_SEARCH_ALIAS_MANIFEST,
  buildUnifiedOrderabilityMap,
  listActiveIvFluidsProviderOrderingCatalogCodes,
  getActiveProviderOrderableCatalogCodes,
  prewarmProviderOrderableCatalogCodesRegistry,
} from "@medora/shared";

export type SeedEnterpriseIvFluidsCatalogOptions = {
  dryRun?: boolean;
};

export type IvFluidSeedBody = {
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
  controlledSchedule: null;
  requiresWitness: boolean;
  requiresDoubleSign: boolean;
  searchText: string;
  ndc11: string | null;
  ndcDisplay: string | null;
  billingCodeDefault: string | null;
  billingUnitType: string | null;
};

export type IvFluidSeedResolveResult =
  | { ok: true; catalogCode: string; body: IvFluidSeedBody; billingSourcePresent: boolean }
  | { ok: false; catalogCode: string; reason: string };

export type SeedEnterpriseIvFluidsCatalogResult = {
  dryRun: boolean;
  activatedCatalogCodes: number;
  catalogCreated: number;
  catalogEnriched: number;
  aliasesUpserted: number;
  aliasesUnchanged: number;
  searchTextUpdated: number;
  skippedMissingSharedArtifact: number;
  skippedRows: Array<{ catalogCode: string; reason: string }>;
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
    if (typeof token !== "string") continue;
    const t = token.trim().toLowerCase();
    if (t.length < 2 || seen.has(t)) continue;
    seen.add(t);
    parts.push(t);
  }
  return parts.join(" ");
}

function safeMapLookup<T>(map: Record<string, T> | undefined | null, key: string): T | undefined {
  if (!map || typeof map !== "object") return undefined;
  return map[key];
}

function collectSearchTokens(input: {
  catalogCode: string;
  aliasEntry?: {
    aliases?: readonly string[];
    searchTerms?: readonly string[];
  };
  formulary?: {
    aliases?: Array<{ text: string }>;
    searchTerms?: string[];
    displayNameEn?: string;
    displayNameFr?: string;
    genericName?: string;
  };
  orderability?: {
    displayNameEn?: string;
    displayNameFr?: string;
    genericName?: string;
  };
  displayNameEn: string;
  displayNameFr: string;
  genericName: string;
}): string[] {
  const formularyAliasTexts = (input.formulary?.aliases ?? [])
    .map((alias) => alias?.text)
    .filter((text): text is string => typeof text === "string" && text.trim().length >= 2);

  return [
    ...(input.aliasEntry?.aliases ?? []),
    ...(input.aliasEntry?.searchTerms ?? []),
    ...(input.formulary?.searchTerms ?? []),
    ...formularyAliasTexts,
    input.displayNameEn,
    input.displayNameFr,
    input.genericName,
    input.catalogCode,
  ];
}

type IvFluidSeedSourceInput = {
  catalogCode: string;
  formulary?: {
    genericName?: string;
    displayNameFr?: string;
    displayNameEn?: string;
    strength?: string;
    dosageForm?: string;
    route?: string;
    therapeuticClass?: string;
    administrationType?: string;
    billingClass?: string;
    aliases?: Array<{ text: string }>;
    searchTerms?: string[];
  };
  orderability?: {
    genericName?: string;
    displayNameFr?: string;
    displayNameEn?: string;
    strength?: string;
    dosageForm?: string;
    route?: string;
    therapeuticClass?: string;
  };
  aliasEntry?: {
    genericName?: string;
    displayHint?: string;
    aliases?: readonly string[];
    searchTerms?: readonly string[];
  };
  billing?: {
    hcpcs?: string;
    ndc11?: string;
    ndcDisplay?: string;
    billingUnitType?: string;
  };
};

/** Build seed body from explicit manifest sources (testable without map imports). */
export function buildIvFluidSeedBodyFromSources(input: IvFluidSeedSourceInput): IvFluidSeedResolveResult {
  const trimmedCode = input.catalogCode.trim();
  if (!trimmedCode) {
    return { ok: false, catalogCode: input.catalogCode, reason: "missing_catalog_code" };
  }

  const { formulary, orderability, aliasEntry, billing } = input;
  if (!formulary && !orderability && !aliasEntry) {
    return { ok: false, catalogCode: trimmedCode, reason: "missing_formulary_orderability_and_alias" };
  }

  const displayNameEn =
    aliasEntry?.displayHint?.trim() ||
    formulary?.displayNameEn?.trim() ||
    orderability?.displayNameEn?.trim() ||
    "";
  const displayNameFr =
    formulary?.displayNameFr?.trim() || orderability?.displayNameFr?.trim() || displayNameEn;
  const genericName =
    formulary?.genericName?.trim() ||
    orderability?.genericName?.trim() ||
    aliasEntry?.genericName?.trim() ||
    displayNameEn;

  if (!displayNameEn) {
    return { ok: false, catalogCode: trimmedCode, reason: "missing_required_display_name_en" };
  }
  if (!genericName) {
    return { ok: false, catalogCode: trimmedCode, reason: "missing_required_generic_name" };
  }

  const route = formulary?.route?.trim() || orderability?.route?.trim() || null;
  const dosageForm = formulary?.dosageForm?.trim() || orderability?.dosageForm?.trim() || null;
  if (!route) {
    return { ok: false, catalogCode: trimmedCode, reason: "missing_required_route" };
  }
  if (!dosageForm) {
    return { ok: false, catalogCode: trimmedCode, reason: "missing_required_dosage_form" };
  }

  const searchTokens = collectSearchTokens({
    catalogCode: trimmedCode,
    aliasEntry,
    formulary,
    orderability,
    displayNameEn,
    displayNameFr,
    genericName,
  });

  return {
    ok: true,
    catalogCode: trimmedCode,
    billingSourcePresent: Boolean(billing?.hcpcs?.trim()),
    body: {
      name: displayNameFr || genericName,
      genericName,
      displayNameFr,
      displayNameEn,
      strength: formulary?.strength?.trim() || orderability?.strength?.trim() || null,
      dosageForm,
      route,
      therapeuticClass: formulary?.therapeuticClass?.trim() || orderability?.therapeuticClass?.trim() || "Soluté",
      administrationType: formulary?.administrationType?.trim() || "INFUSION",
      billingClass: formulary?.billingClass?.trim() || "HYDRATION",
      sortPriority: 0,
      isEssential: true,
      isActive: true,
      isControlled: false,
      controlledSchedule: null,
      requiresWitness: false,
      requiresDoubleSign: false,
      searchText: mergeSearchText("", searchTokens),
      ndc11: billing?.ndc11?.trim() || null,
      ndcDisplay: billing?.ndcDisplay?.trim() || null,
      billingCodeDefault: billing?.hcpcs?.trim() || null,
      billingUnitType: billing?.billingUnitType?.trim() || null,
    },
  };
}

/**
 * Resolve catalog seed body for one IV fluid code.
 * Exported for seed tests — does not write to the database.
 */
export function resolveIvFluidSeedBody(catalogCode: string): IvFluidSeedResolveResult {
  const trimmedCode = catalogCode.trim();
  return buildIvFluidSeedBodyFromSources({
    catalogCode: trimmedCode,
    formulary: safeMapLookup(ENTERPRISE_IV_FLUIDS_FORMULARY_BY_CODE, trimmedCode),
    orderability: buildUnifiedOrderabilityMap().get(trimmedCode),
    aliasEntry: safeMapLookup(ENTERPRISE_IV_FLUIDS_SEARCH_ALIAS_BY_CODE, trimmedCode),
    billing: safeMapLookup(ENTERPRISE_IV_FLUIDS_BILLING_BY_CODE, trimmedCode),
  });
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
    skippedRows: [],
  };

  const activatedCodes = listActiveIvFluidsProviderOrderingCatalogCodes();
  prewarmProviderOrderableCatalogCodesRegistry();
  const activeRegistry = getActiveProviderOrderableCatalogCodes();
  const manifestCodes = Object.keys(ENTERPRISE_IV_FLUIDS_FORMULARY_BY_CODE ?? {});
  const seedCodes = [
    ...new Set([
      ...activatedCodes,
      ...manifestCodes.filter((code) => activeRegistry.has(code)),
    ]),
  ];
  result.activatedCatalogCodes = seedCodes.length;

  for (const catalogCode of seedCodes) {
    const resolved = resolveIvFluidSeedBody(catalogCode);
    if (!resolved.ok) {
      result.skippedMissingSharedArtifact += 1;
      result.skippedRows.push({ catalogCode, reason: resolved.reason });
      continue;
    }
    const body = resolved.body;

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
            isActive: body.isActive,
            ndc11: body.ndc11,
            ndcDisplay: body.ndcDisplay,
            billingCodeDefault: body.billingCodeDefault,
            billingUnitType: body.billingUnitType,
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
