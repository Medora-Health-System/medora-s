import { formatIcd10CmDisplayCode } from "./formatIcd10CmDisplayCode.js";
import { GOVERNED_ICD10_CLINICIAN_LABELS } from "./governedIcd10ClinicianLabels.js";
import { normalizeIcd10CodeForLookup } from "../icd10Normalize.js";
import { buildGovernedSpanishSearchAliasSeeds } from "./icd10GovernedSearchAliases.js";
import { assertGovernedIcd10MapsAligned, type GovernedIcd10DisplayMaps } from "./inspectGovernedIcd10ClinicianLabels.js";
import {
  ICD10_CM_CODE_SYSTEM,
  ICD10_GOVERNED_SEARCH_ALIAS_VERSION,
  ICD10_GOVERNED_SOURCE_ID,
  ICD10_GOVERNED_TERMINOLOGY_VERSION,
  ICD10_SOURCE_PRIORITY,
} from "./icd10TerminologyTypes.js";

export type Icd10CatalogIdentity = {
  id: string;
  code: string;
  normalizedCode: string;
  codeSystem: string;
  releaseVersion: string;
};

export type GovernedTerminologySeedRow = {
  icd10CatalogId: string;
  codeSystem: string;
  releaseVersion: string;
  code: string;
  normalizedCode: string;
  locale: "fr" | "es";
  preferredLabel: string;
  labelRegister: "CLINICIAN_PREFERRED";
  provenance: "MEDORA_GOVERNED";
  exactness: "EXACT_GOVERNED";
  sourceId: typeof ICD10_GOVERNED_SOURCE_ID;
  terminologyVersion: typeof ICD10_GOVERNED_TERMINOLOGY_VERSION;
  sourcePriority: typeof ICD10_SOURCE_PRIORITY.MEDORA_GOVERNED;
  status: "APPROVED";
  isEffective: true;
};

export type GovernedSearchAliasSeedRow = {
  icd10CatalogId: string;
  codeSystem: string;
  releaseVersion: string;
  code: string;
  normalizedCode: string;
  locale: "es";
  aliasText: string;
  provenance: "MEDORA_GOVERNED";
  sourceId: typeof ICD10_GOVERNED_SOURCE_ID;
  terminologyVersion: typeof ICD10_GOVERNED_SEARCH_ALIAS_VERSION;
  status: "APPROVED";
};

export type RejectedGovernedLabel = {
  normalizedCode: string;
  locale: "fr" | "es";
  label: string;
  reason: "CODE_NOT_IN_TARGET_RELEASE" | "IDENTITY_MISMATCH";
};

export type GovernedIcd10TerminologySeedPlan = {
  terminologyVersion: typeof ICD10_GOVERNED_TERMINOLOGY_VERSION;
  acceptedTerminology: GovernedTerminologySeedRow[];
  acceptedAliases: GovernedSearchAliasSeedRow[];
  rejected: RejectedGovernedLabel[];
  detectedFr: number;
  detectedEs: number;
};

function exactCatalogMatch(
  catalog: Icd10CatalogIdentity | undefined,
  normalizedCode: string,
  expectedCodeSystem: string,
  expectedReleaseVersion: string,
): catalog is Icd10CatalogIdentity {
  if (!catalog) return false;
  if (catalog.codeSystem !== expectedCodeSystem) return false;
  if (catalog.releaseVersion !== expectedReleaseVersion) return false;
  if (catalog.normalizedCode !== normalizedCode) return false;
  if (normalizeIcd10CodeForLookup(catalog.code) !== normalizedCode) return false;
  return true;
}

export function buildGovernedIcd10TerminologySeedPlan(input: {
  maps?: GovernedIcd10DisplayMaps;
  catalogByNormalizedCode: ReadonlyMap<string, Icd10CatalogIdentity>;
  expectedCodeSystem?: string;
  expectedReleaseVersion: string;
}): GovernedIcd10TerminologySeedPlan {
  const maps = input.maps ?? GOVERNED_ICD10_CLINICIAN_LABELS;
  assertGovernedIcd10MapsAligned(maps);
  const expectedCodeSystem = input.expectedCodeSystem ?? ICD10_CM_CODE_SYSTEM;
  const acceptedTerminology: GovernedTerminologySeedRow[] = [];
  const rejected: RejectedGovernedLabel[] = [];
  const locales = ["fr", "es"] as const;

  for (const locale of locales) {
    for (const [normalizedCode, label] of Object.entries(maps[locale])) {
      const catalog = input.catalogByNormalizedCode.get(normalizedCode);
      if (!exactCatalogMatch(catalog, normalizedCode, expectedCodeSystem, input.expectedReleaseVersion)) {
        const presentWrongIdentity = Boolean(catalog);
        rejected.push({
          normalizedCode,
          locale,
          label,
          reason: presentWrongIdentity ? "IDENTITY_MISMATCH" : "CODE_NOT_IN_TARGET_RELEASE",
        });
        continue;
      }
      acceptedTerminology.push({
        icd10CatalogId: catalog.id,
        codeSystem: catalog.codeSystem,
        releaseVersion: catalog.releaseVersion,
        code: catalog.code || formatIcd10CmDisplayCode(normalizedCode),
        normalizedCode: catalog.normalizedCode,
        locale,
        preferredLabel: label,
        labelRegister: "CLINICIAN_PREFERRED",
        provenance: "MEDORA_GOVERNED",
        exactness: "EXACT_GOVERNED",
        sourceId: ICD10_GOVERNED_SOURCE_ID,
        terminologyVersion: ICD10_GOVERNED_TERMINOLOGY_VERSION,
        sourcePriority: ICD10_SOURCE_PRIORITY.MEDORA_GOVERNED,
        status: "APPROVED",
        isEffective: true,
      });
    }
  }

  const acceptedNormalized = new Set(
    acceptedTerminology.filter((row) => row.locale === "es").map((row) => row.normalizedCode),
  );
  const acceptedAliases: GovernedSearchAliasSeedRow[] = [];
  for (const alias of buildGovernedSpanishSearchAliasSeeds(acceptedNormalized)) {
    const catalog = input.catalogByNormalizedCode.get(alias.normalizedCode);
    if (!catalog) continue;
    acceptedAliases.push({
      icd10CatalogId: catalog.id,
      codeSystem: catalog.codeSystem,
      releaseVersion: catalog.releaseVersion,
      code: catalog.code,
      normalizedCode: catalog.normalizedCode,
      locale: alias.locale,
      aliasText: alias.aliasText,
      provenance: "MEDORA_GOVERNED",
      sourceId: ICD10_GOVERNED_SOURCE_ID,
      terminologyVersion: ICD10_GOVERNED_SEARCH_ALIAS_VERSION,
      status: "APPROVED",
    });
  }

  return {
    terminologyVersion: ICD10_GOVERNED_TERMINOLOGY_VERSION,
    acceptedTerminology,
    acceptedAliases,
    rejected,
    detectedFr: Object.keys(maps.fr).length,
    detectedEs: Object.keys(maps.es).length,
  };
}
