/**
 * Seeds enterprise domain formulary CREATE rows (cardiology, psychiatry, GI, peds, OBGYN, neurology/ID)
 * via the generic manifest seed engine.
 */
import type { PrismaClient } from "@prisma/client";
import { ENTERPRISE_CARDIOLOGY_FORMULARY_BY_CODE } from "../../../../packages/shared/dist/medication/enterpriseCardiologyFormularyManifest.js";
import { ENTERPRISE_PSYCHIATRY_FORMULARY_BY_CODE } from "../../../../packages/shared/dist/medication/enterprisePsychiatryFormularyManifest.js";
import { ENTERPRISE_GASTROENTEROLOGY_FORMULARY_BY_CODE } from "../../../../packages/shared/dist/medication/enterpriseGastroenterologyFormularyManifest.js";
import { ENTERPRISE_PEDIATRICS_FORMULARY_BY_CODE } from "../../../../packages/shared/dist/medication/enterprisePediatricsFormularyManifest.js";
import { ENTERPRISE_OBGYN_FORMULARY_BY_CODE } from "../../../../packages/shared/dist/medication/enterpriseObgynFormularyManifest.js";
import { ENTERPRISE_NEUROLOGY_INFECTIOUS_DISEASE_FORMULARY_BY_CODE } from "../../../../packages/shared/dist/medication/enterpriseNeurologyInfectiousDiseaseFormularyManifest.js";
import {
  buildActiveProviderOrderableRegistryForSeed,
  seedEnterpriseMedicationManifestProfile,
  type EnterpriseManifestAliasSpec,
  type EnterpriseManifestBillingSpec,
  type EnterpriseManifestSeedResolveResult,
  type EnterpriseMedicationManifestSeedResult,
} from "./seed-enterprise-medication-manifest";

type DomainFormularyEntry = {
  catalogCode: string;
  genericName: string;
  displayNameFr: string;
  displayNameEn: string;
  strength: string;
  dosageForm: string;
  route: string;
  therapeuticClass: string;
  administrationType?: string;
  billingClass?: string;
  mode?: "CREATE" | "ENRICH";
  aliases?: Array<{ text: string; language: "en" | "fr" }>;
  searchTerms?: string[];
  governance: {
    isControlled: boolean;
    controlledSchedule: string | null;
    requiresWitness: boolean;
    requiresDoubleSign: boolean;
  };
  isEssential?: boolean;
};

function resolveDomainEntry(
  catalogCode: string,
  entry: DomainFormularyEntry | undefined,
  billing?: EnterpriseManifestBillingSpec | null
): EnterpriseManifestSeedResolveResult {
  if (!entry) return { ok: false, catalogCode, reason: "missing formulary manifest entry" };
  if (entry.mode === "ENRICH") return { ok: false, catalogCode, reason: "ENRICH handled by wave seeds" };

  const aliases: EnterpriseManifestAliasSpec[] = (entry.aliases ?? []).map((a) => ({
    text: a.text,
    language: a.language,
  }));

  return {
    ok: true,
    catalogCode,
    billingSourcePresent: Boolean(billing?.hcpcs?.trim()),
    aliases,
    body: {
      name: entry.displayNameFr || entry.genericName,
      genericName: entry.genericName,
      displayNameFr: entry.displayNameFr,
      displayNameEn: entry.displayNameEn,
      strength: entry.strength,
      dosageForm: entry.dosageForm,
      route: entry.route,
      therapeuticClass: entry.therapeuticClass,
      administrationType: entry.administrationType?.trim() || "ROUTINE",
      billingClass: entry.billingClass?.trim() || "MEDICATION",
      sortPriority: 0,
      isEssential: entry.isEssential ?? false,
      isActive: false,
      isControlled: entry.governance.isControlled,
      controlledSchedule: entry.governance.controlledSchedule,
      requiresWitness: entry.governance.requiresWitness,
      requiresDoubleSign: entry.governance.requiresDoubleSign,
      searchText: [...(entry.searchTerms ?? []), entry.genericName, entry.displayNameEn, entry.displayNameFr]
        .join(" ")
        .toLowerCase(),
      ndc11: billing?.ndc11?.trim() || null,
      ndcDisplay: billing?.ndcDisplay?.trim() || null,
      billingCodeDefault: billing?.hcpcs?.trim() || null,
      billingUnitType: billing?.billingUnitType?.trim() || null,
    },
  };
}

const DOMAIN_MANIFESTS: Array<{
  domain: string;
  byCode: Record<string, DomainFormularyEntry>;
  billingByCode?: Record<string, EnterpriseManifestBillingSpec>;
}> = [
  { domain: "cardiology", byCode: ENTERPRISE_CARDIOLOGY_FORMULARY_BY_CODE as Record<string, DomainFormularyEntry> },
  { domain: "psychiatry", byCode: ENTERPRISE_PSYCHIATRY_FORMULARY_BY_CODE as Record<string, DomainFormularyEntry> },
  {
    domain: "gastroenterology",
    byCode: ENTERPRISE_GASTROENTEROLOGY_FORMULARY_BY_CODE as Record<string, DomainFormularyEntry>,
  },
  { domain: "pediatrics", byCode: ENTERPRISE_PEDIATRICS_FORMULARY_BY_CODE as Record<string, DomainFormularyEntry> },
  { domain: "obgyn", byCode: ENTERPRISE_OBGYN_FORMULARY_BY_CODE as Record<string, DomainFormularyEntry> },
  {
    domain: "neurologyInfectiousDisease",
    byCode: ENTERPRISE_NEUROLOGY_INFECTIOUS_DISEASE_FORMULARY_BY_CODE as Record<string, DomainFormularyEntry>,
  },
];

export async function seedEnterpriseDomainFormularyCatalog(
  prisma: PrismaClient,
  options: { dryRun?: boolean; createProducts?: boolean } = {}
): Promise<EnterpriseMedicationManifestSeedResult[]> {
  const activeRegistry = buildActiveProviderOrderableRegistryForSeed();
  const results: EnterpriseMedicationManifestSeedResult[] = [];

  for (const manifest of DOMAIN_MANIFESTS) {
    const createCodes = Object.values(manifest.byCode)
      .filter((entry) => entry.mode !== "ENRICH")
      .map((entry) => entry.catalogCode)
      .filter((code) => activeRegistry.has(code));

    if (createCodes.length === 0) continue;

    const result = await seedEnterpriseMedicationManifestProfile(
      prisma,
      {
        domain: manifest.domain,
        catalogCodes: createCodes,
        mergeSearchText: "additive",
        createProducts: options.createProducts,
        resolve: (catalogCode) =>
          resolveDomainEntry(
            catalogCode,
            manifest.byCode[catalogCode],
            manifest.billingByCode?.[catalogCode] ?? null
          ),
      },
      { dryRun: options.dryRun, activeRegistry, createProducts: options.createProducts }
    );
    results.push(result);
  }

  return results;
}
