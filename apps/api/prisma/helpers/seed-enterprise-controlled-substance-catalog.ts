import type { PrismaClient } from "@prisma/client";
import {
  ENTERPRISE_CONTROLLED_SUBSTANCE_BILLING_BY_CODE,
  ENTERPRISE_CONTROLLED_SUBSTANCE_FORMULARY_BY_CODE,
  ENTERPRISE_CONTROLLED_SUBSTANCE_FORMULARY_MANIFEST,
  listActiveControlledSubstanceProviderOrderingCatalogCodes,
} from "@medora/shared";

export type SeedEnterpriseControlledSubstanceCatalogOptions = {
  dryRun?: boolean;
};

export type ControlledSubstanceSeedBody = {
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

export type ControlledSubstanceSeedResolveResult =
  | { ok: true; catalogCode: string; body: ControlledSubstanceSeedBody; billingSourcePresent: boolean; aliases: string[] }
  | { ok: false; catalogCode: string; reason: string };

export type SeedEnterpriseControlledSubstanceCatalogResult = {
  dryRun: boolean;
  waveCCatalogCodes: number;
  catalogCreated: number;
  catalogEnriched: number;
  aliasesUpserted: number;
  aliasesUnchanged: number;
  searchTextUpdated: number;
  skippedMissingManifest: number;
  skippedRows: Array<{ catalogCode: string; reason: string }>;
};

/** Wave C catalog remediation codes — must exist in enterprise controlled-substance formulary manifest. */
export const CONTROLLED_SUBSTANCE_WAVE_C_SEED_CATALOG_CODES = [
  "HYDROMORPHONE_0_5_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "CYCLOBENZAPRINE_5_MG_COMPRIME_ORAL",
  "CYCLOBENZAPRINE_10_MG_COMPRIME_ORAL",
  "METHOCARBAMOL_500_MG_COMPRIME_ORAL",
  "METHOCARBAMOL_750_MG_COMPRIME_ORAL",
  "TIZANIDINE_2_MG_COMPRIME_ORAL",
  "TIZANIDINE_4_MG_COMPRIME_ORAL",
  "LIDOCAINE_5_PATCH_TRANSDERMAL",
  "DICLOFENAC_1_GEL_TOPICAL",
  "HYDROCODONE_ACETAMINOPHEN_5_325_COMPRIME_ORAL",
  "HYDROCODONE_ACETAMINOPHEN_7_5_325_COMPRIME_ORAL",
  "HYDROCODONE_ACETAMINOPHEN_10_325_COMPRIME_ORAL",
  "OXYCODONE_ACETAMINOPHEN_5_325_COMPRIME_ORAL",
  "OXYCODONE_ACETAMINOPHEN_7_5_325_COMPRIME_ORAL",
  "OXYCODONE_ACETAMINOPHEN_10_325_COMPRIME_ORAL",
  "ACETAMINOPHEN_CODEINE_300_15_COMPRIME_ORAL",
  "ACETAMINOPHEN_CODEINE_300_30_COMPRIME_ORAL",
  "ACETAMINOPHEN_CODEINE_300_60_COMPRIME_ORAL",
  "OXYCODONE_5_MG_COMPRIME_ORAL",
  "OXYCODONE_10_MG_COMPRIME_ORAL",
  "GABAPENTIN_100_MG_GELULE_ORAL",
  "GABAPENTIN_300_MG_GELULE_ORALE",
  "GABAPENTIN_400_MG_GELULE_ORAL",
  "PREGABALIN_50_MG_GELULE_ORAL",
  "PREGABALIN_75_MG_GELULE_ORALE",
  "PREGABALIN_150_MG_GELULE_ORAL",
] as const;

/** Clinical brand/generic aliases for provider search (deduped per catalog row). */
export const CONTROLLED_SUBSTANCE_WAVE_C_BRAND_ALIASES: Readonly<Record<string, readonly string[]>> = {
  HYDROMORPHONE_0_5_MG_ML_INJECTABLE_INTRAVEINEUSE: ["dilaudid", "hydromorphone"],
  CYCLOBENZAPRINE_5_MG_COMPRIME_ORAL: ["flexeril", "cyclobenzaprine"],
  CYCLOBENZAPRINE_10_MG_COMPRIME_ORAL: ["flexeril", "cyclobenzaprine"],
  METHOCARBAMOL_500_MG_COMPRIME_ORAL: ["robaxin", "methocarbamol"],
  METHOCARBAMOL_750_MG_COMPRIME_ORAL: ["robaxin", "methocarbamol"],
  TIZANIDINE_2_MG_COMPRIME_ORAL: ["tizanidine"],
  TIZANIDINE_4_MG_COMPRIME_ORAL: ["tizanidine"],
  LIDOCAINE_5_PATCH_TRANSDERMAL: ["lidocaine patch", "lidocaine"],
  DICLOFENAC_1_GEL_TOPICAL: ["voltaren", "diclofenac gel", "diclofenac"],
  HYDROCODONE_ACETAMINOPHEN_5_325_COMPRIME_ORAL: ["norco", "hydrocodone"],
  HYDROCODONE_ACETAMINOPHEN_7_5_325_COMPRIME_ORAL: ["norco", "hydrocodone"],
  HYDROCODONE_ACETAMINOPHEN_10_325_COMPRIME_ORAL: ["norco", "hydrocodone"],
  OXYCODONE_ACETAMINOPHEN_5_325_COMPRIME_ORAL: ["percocet", "oxycodone"],
  OXYCODONE_ACETAMINOPHEN_7_5_325_COMPRIME_ORAL: ["percocet", "oxycodone"],
  OXYCODONE_ACETAMINOPHEN_10_325_COMPRIME_ORAL: ["percocet", "oxycodone"],
  ACETAMINOPHEN_CODEINE_300_15_COMPRIME_ORAL: ["tylenol 3", "tylenol #3", "codeine"],
  ACETAMINOPHEN_CODEINE_300_30_COMPRIME_ORAL: ["tylenol 3", "tylenol #3", "codeine"],
  ACETAMINOPHEN_CODEINE_300_60_COMPRIME_ORAL: ["tylenol 3", "tylenol #3", "codeine"],
  OXYCODONE_5_MG_COMPRIME_ORAL: ["oxycodone"],
  OXYCODONE_10_MG_COMPRIME_ORAL: ["oxycodone"],
  GABAPENTIN_100_MG_GELULE_ORAL: ["neurontin", "gabapentin"],
  GABAPENTIN_300_MG_GELULE_ORALE: ["neurontin", "gabapentin"],
  GABAPENTIN_400_MG_GELULE_ORAL: ["neurontin", "gabapentin"],
  PREGABALIN_50_MG_GELULE_ORAL: ["lyrica", "pregabalin"],
  PREGABALIN_75_MG_GELULE_ORALE: ["lyrica", "pregabalin"],
  PREGABALIN_150_MG_GELULE_ORAL: ["lyrica", "pregabalin"],
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

type FormularyEntry = (typeof ENTERPRISE_CONTROLLED_SUBSTANCE_FORMULARY_MANIFEST)[number];

export function buildControlledSubstanceSeedBodyFromSources(input: {
  catalogCode: string;
  formulary?: FormularyEntry;
  billing?: {
    hcpcs?: string;
    ndc11?: string;
    ndcDisplay?: string;
    billingUnitType?: string;
  };
  extraAliases?: readonly string[];
  isActive?: boolean;
}): ControlledSubstanceSeedResolveResult {
  const trimmedCode = input.catalogCode.trim();
  if (!trimmedCode) {
    return { ok: false, catalogCode: input.catalogCode, reason: "missing_catalog_code" };
  }

  const formulary = input.formulary;
  if (!formulary) {
    return { ok: false, catalogCode: trimmedCode, reason: "missing_formulary_manifest_row" };
  }

  const displayNameEn = formulary.displayNameEn?.trim() || "";
  const displayNameFr = formulary.displayNameFr?.trim() || displayNameEn;
  const genericName = formulary.genericName?.trim() || displayNameEn;
  const route = formulary.route?.trim() || null;
  const dosageForm = formulary.dosageForm?.trim() || null;

  if (!displayNameEn) {
    return { ok: false, catalogCode: trimmedCode, reason: "missing_required_display_name_en" };
  }
  if (!genericName) {
    return { ok: false, catalogCode: trimmedCode, reason: "missing_required_generic_name" };
  }
  if (!route) {
    return { ok: false, catalogCode: trimmedCode, reason: "missing_required_route" };
  }
  if (!dosageForm) {
    return { ok: false, catalogCode: trimmedCode, reason: "missing_required_dosage_form" };
  }

  const manifestAliasTexts = formulary.aliases.map((alias) => alias.text).filter(Boolean);
  const aliasTexts = [
    ...(input.extraAliases ?? []),
    ...manifestAliasTexts,
    ...formulary.searchTerms,
    displayNameEn,
    displayNameFr,
    genericName,
    trimmedCode,
  ]
    .map(normalizeAlias)
    .filter((alias) => alias.length >= 2);

  const uniqueAliases = [...new Set(aliasTexts)];

  return {
    ok: true,
    catalogCode: trimmedCode,
    billingSourcePresent: Boolean(input.billing?.hcpcs?.trim()),
    aliases: uniqueAliases,
    body: {
      name: displayNameFr || genericName,
      genericName,
      displayNameFr,
      displayNameEn,
      strength: formulary.strength?.trim() || null,
      dosageForm,
      route,
      therapeuticClass: formulary.therapeuticClass?.trim() || "Antalgique",
      administrationType: formulary.administrationType?.trim() || "ORAL",
      billingClass: formulary.billingClass?.trim() || "THERAPEUTIC",
      sortPriority: 0,
      isEssential: false,
      isActive: input.isActive !== false,
      isControlled: formulary.governance.isControlled,
      controlledSchedule: formulary.governance.controlledSchedule,
      requiresWitness: formulary.governance.requiresWitness,
      requiresDoubleSign: formulary.governance.requiresDoubleSign,
      searchText: mergeSearchText("", uniqueAliases),
      ndc11: input.billing?.ndc11?.trim() || null,
      ndcDisplay: input.billing?.ndcDisplay?.trim() || null,
      billingCodeDefault: input.billing?.hcpcs?.trim() || null,
      billingUnitType: input.billing?.billingUnitType?.trim() || null,
    },
  };
}

export function resolveControlledSubstanceWaveCSeedBody(
  catalogCode: string,
  activeRegistryCodes?: ReadonlySet<string>
): ControlledSubstanceSeedResolveResult {
  const trimmedCode = catalogCode.trim();
  const activeCodes = activeRegistryCodes ?? new Set(listActiveControlledSubstanceProviderOrderingCatalogCodes());
  return buildControlledSubstanceSeedBodyFromSources({
    catalogCode: trimmedCode,
    formulary: safeMapLookup(ENTERPRISE_CONTROLLED_SUBSTANCE_FORMULARY_BY_CODE, trimmedCode),
    billing: safeMapLookup(ENTERPRISE_CONTROLLED_SUBSTANCE_BILLING_BY_CODE, trimmedCode),
    extraAliases: CONTROLLED_SUBSTANCE_WAVE_C_BRAND_ALIASES[trimmedCode] ?? [],
    isActive: activeCodes.has(trimmedCode) || CONTROLLED_SUBSTANCE_WAVE_C_SEED_CATALOG_CODES.includes(trimmedCode as (typeof CONTROLLED_SUBSTANCE_WAVE_C_SEED_CATALOG_CODES)[number]),
  });
}

/**
 * MEDUI.MEDICATION.CONTROLLED_SUBSTANCES_WAVE_C_PRODUCTION_SEED.1
 * Backfill Wave C controlled-substance and pain-adjunct catalog rows + clinical search aliases.
 */
export async function seedEnterpriseControlledSubstanceCatalog(
  prisma: PrismaClient,
  options: SeedEnterpriseControlledSubstanceCatalogOptions = {}
): Promise<SeedEnterpriseControlledSubstanceCatalogResult> {
  const dryRun = options.dryRun === true;
  const result: SeedEnterpriseControlledSubstanceCatalogResult = {
    dryRun,
    waveCCatalogCodes: CONTROLLED_SUBSTANCE_WAVE_C_SEED_CATALOG_CODES.length,
    catalogCreated: 0,
    catalogEnriched: 0,
    aliasesUpserted: 0,
    aliasesUnchanged: 0,
    searchTextUpdated: 0,
    skippedMissingManifest: 0,
    skippedRows: [],
  };

  const activeRegistryCodes = new Set(listActiveControlledSubstanceProviderOrderingCatalogCodes());

  for (const catalogCode of CONTROLLED_SUBSTANCE_WAVE_C_SEED_CATALOG_CODES) {
    const resolved = resolveControlledSubstanceWaveCSeedBody(catalogCode, activeRegistryCodes);
    if (!resolved.ok) {
      result.skippedMissingManifest += 1;
      result.skippedRows.push({ catalogCode, reason: resolved.reason });
      continue;
    }

    const { body, aliases } = resolved;
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
        const mergedSearchText = mergeSearchText(existing.searchText, body.searchText.split(/\s+/));
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
            isControlled: body.isControlled,
            controlledSchedule: body.controlledSchedule,
            requiresWitness: body.requiresWitness,
            requiresDoubleSign: body.requiresDoubleSign,
            ndc11: body.ndc11,
            ndcDisplay: body.ndcDisplay,
            billingCodeDefault: body.billingCodeDefault,
            billingUnitType: body.billingUnitType,
            searchText: mergedSearchText,
          },
        });
        if (mergedSearchText !== mergeSearchText(existing.searchText, [])) {
          result.searchTextUpdated += 1;
        }
      }
      result.catalogEnriched += 1;
    }

    const catalog = dryRun
      ? existing ?? { id: `dry-run-${catalogCode}`, searchText: null }
      : await prisma.catalogMedication.findUnique({
          where: { code: catalogCode },
          select: { id: true, searchText: true },
        });
    if (!catalog || dryRun) {
      if (dryRun) result.aliasesUpserted += aliases.length;
      continue;
    }

    if (!dryRun) {
      const mergedSearchText = mergeSearchText(catalog.searchText, aliases);
      if (mergedSearchText !== mergeSearchText(catalog.searchText, [])) {
        await prisma.catalogMedication.update({
          where: { id: catalog.id },
          data: { searchText: mergedSearchText },
        });
        result.searchTextUpdated += 1;
      }

      for (const alias of aliases) {
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
      result.aliasesUpserted += aliases.length;
    }
  }

  return result;
}
