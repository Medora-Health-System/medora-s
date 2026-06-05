/**
 * M1.8B — Critical ED gap remediation (manifest, admin-type normalization, harmonization).
 * No Wave 4 activation; no bulk enablement.
 */

import {
  resolveWave4ProductAdministrationType,
  WAVE4_SAFE_MAR_ADMIN_TYPES,
} from "./wave4AdministrationTypeRemediation.js";

export const ED_CRITICAL_GAP_REMEDIATION_VERSION = "M1.8B" as const;

export type EdSafeMarAdminType = "ORAL" | "IM" | "SQ" | "PUSH" | "INFUSION";

export type EdLegacyAdminTypeRemediationTarget = {
  catalogCode: string;
  targetAdministrationType: EdSafeMarAdminType;
  legacyTypes: readonly ("INJECTION" | "SUBCUTANEOUS")[];
};

/** Legacy gate-blocked administration types → current Medora MAR-safe taxonomy. */
export const ED_LEGACY_ADMIN_TYPE_REMEDIATION: readonly EdLegacyAdminTypeRemediationTarget[] = [
  {
    // Multidose 5,000 U/mL vial (route: injectable) — SQ prophylaxis is primary Haiti use;
    // Wave 4 IV bolus (PUSH) and premix drip (INFUSION) remain separate inactive SKUs.
    catalogCode: "HEPARIN_5000UI_ML_INJECTABLE",
    targetAdministrationType: "SQ",
    legacyTypes: ["INJECTION"],
  },
  {
    catalogCode: "REGULAR_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS",
    targetAdministrationType: "SQ",
    legacyTypes: ["SUBCUTANEOUS"],
  },
  {
    catalogCode: "NPH_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS",
    targetAdministrationType: "SQ",
    legacyTypes: ["SUBCUTANEOUS"],
  },
  {
    catalogCode: "INSULIN_7030_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS",
    targetAdministrationType: "SQ",
    legacyTypes: ["SUBCUTANEOUS"],
  },
  {
    catalogCode: "INSULIN_LISPRO_100_UI_ML_INJECTABLE_SOUS_CUTANEE",
    targetAdministrationType: "SQ",
    legacyTypes: ["SUBCUTANEOUS"],
  },
  {
    catalogCode: "INSULIN_GLARGINE_100_UI_ML_INJECTABLE_SOUS_CUTANEE",
    targetAdministrationType: "SQ",
    legacyTypes: ["SUBCUTANEOUS"],
  },
  {
    catalogCode: "INSULIN_ASPART_100_UI_ML_INJECTABLE_SOUS_CUTANEE",
    targetAdministrationType: "SQ",
    legacyTypes: ["SUBCUTANEOUS"],
  },
] as const;

export const ED_LEGACY_ADMIN_TYPE_REMEDIATION_BY_CATALOG_CODE: Readonly<
  Record<string, EdLegacyAdminTypeRemediationTarget>
> = Object.fromEntries(ED_LEGACY_ADMIN_TYPE_REMEDIATION.map((e) => [e.catalogCode, e]));

export type EdClonidineFormularyEntry = {
  catalogCode: string;
  genericName: string;
  displayNameFr: string;
  displayNameEn: string;
  strength: string;
  dosageForm: string;
  route: string;
  therapeuticClass: string;
  administrationType: EdSafeMarAdminType;
  billingClass: "DRUG_SUPPLY" | "THERAPEUTIC";
  aliases: readonly string[];
  searchTerms: readonly string[];
};

export const ED_CLONIDINE_FORMULARY_ENTRIES: readonly EdClonidineFormularyEntry[] = [
  {
    catalogCode: "CLONIDINE_0_1_MG_COMPRIME_ORAL",
    genericName: "Clonidine",
    displayNameFr: "Clonidine",
    displayNameEn: "Clonidine",
    strength: "0.1 mg",
    dosageForm: "comprimé",
    route: "orale",
    therapeuticClass: "Antihypertenseur",
    administrationType: "ORAL",
    billingClass: "DRUG_SUPPLY",
    aliases: ["Catapres", "catapres"],
    searchTerms: ["clonidine", "catapres"],
  },
  {
    catalogCode: "CLONIDINE_0_2_MG_COMPRIME_ORAL",
    genericName: "Clonidine",
    displayNameFr: "Clonidine",
    displayNameEn: "Clonidine",
    strength: "0.2 mg",
    dosageForm: "comprimé",
    route: "orale",
    therapeuticClass: "Antihypertenseur",
    administrationType: "ORAL",
    billingClass: "DRUG_SUPPLY",
    aliases: ["Catapres", "catapres"],
    searchTerms: ["clonidine", "catapres"],
  },
] as const;

export type EdCatalogHarmonizationEntry = {
  /** Haiti / prior-wave canonical catalog code (search anchor). */
  canonicalCatalogCode: string;
  /** Wave 4 or duplicate enterprise codes (non-destructive reference only). */
  wave4DuplicateCodes: readonly string[];
  /** Cross-search aliases applied to the canonical catalog row. */
  crossSearchAliases: readonly string[];
  note: string;
};

/**
 * Non-destructive Haiti ↔ Wave 4 duplicate coding harmonization.
 * Adds search aliases on canonical rows; does not delete or replace Wave 4 rows.
 */
export const ED_CATALOG_HARMONIZATION: readonly EdCatalogHarmonizationEntry[] = [
  {
    canonicalCatalogCode: "ADRENALINE_1_MG_PER_ML_INJECTABLE_INJECTION",
    wave4DuplicateCodes: [
      "EPINEPHRINE_1_MG_1_ML_IM_INJECTABLE_INTRAMUSCULAIRE",
      "EPINEPHRINE_0_15_MG_0_15_ML_INJECTABLE_INTRAMUSCULAIRE",
      "EPINEPHRINE_0_3_MG_0_3_ML_INJECTABLE_INTRAMUSCULAIRE",
    ],
    crossSearchAliases: ["epinephrine", "epi pen", "epi"],
    note: "Adrenaline (Haiti) ↔ Epinephrine (Wave 4 naming)",
  },
  {
    canonicalCatalogCode: "CLINDAMYCIN_600_MG_PER_4_ML_INJECTABLE_INJECTION",
    wave4DuplicateCodes: ["CLINDAMYCIN_900_MG_50_ML_PERFUSION_INTRAVEINEUSE"],
    crossSearchAliases: ["clindamycin iv", "clindamycin perfusion"],
    note: "Haiti injectable ↔ Wave 4 IV bag SKU",
  },
  {
    canonicalCatalogCode: "MEROPENEM_1_G_INJECTABLE_INTRAVENOUS",
    wave4DuplicateCodes: [
      "MEROPENEM_1_G_POUDRE_INTRAVEINEUSE",
      "MEROPENEM_500_MG_POUDRE_INTRAVEINEUSE",
    ],
    crossSearchAliases: ["meropenem iv", "meronem iv"],
    note: "Haiti meropenem ↔ Wave 4 powder IV SKUs",
  },
  {
    canonicalCatalogCode: "METHYLPREDNISOLONE_125MG",
    wave4DuplicateCodes: ["METHYLPREDNISOLONE_40_MG_POUDRE_INTRAVEINEUSE"],
    crossSearchAliases: ["solumedrol iv", "methylprednisolone iv"],
    note: "Haiti 125 mg ↔ Wave 4 40 mg powder SKU",
  },
  {
    canonicalCatalogCode: "CIPROFLOXACIN_500",
    wave4DuplicateCodes: ["CIPROFLOXACIN_400_MG_200_ML_PERFUSION_INTRAVEINEUSE"],
    crossSearchAliases: ["cipro iv", "ciprofloxacin iv", "cipro perfusion"],
    note: "Oral Haiti anchor ↔ Wave 4 IV perfusion SKU",
  },
] as const;

export type EdCriticalAliasUpsert = {
  catalogCode: string;
  aliases: readonly string[];
};

/** Critical brand/generic aliases seeded idempotently (Reglan, Pitocin, Catapres). */
export const ED_CRITICAL_ALIAS_UPSERTS: readonly EdCriticalAliasUpsert[] = [
  {
    catalogCode: "METOCLOPRAMIDE_10_MG_PER_2_ML_INJECTABLE_INJECTION",
    aliases: ["reglan", "Reglan"],
  },
  {
    catalogCode: "OXYTOCIN_10_UI_PER_ML_INJECTABLE_INJECTION",
    aliases: ["pitocin", "Pitocin"],
  },
  ...ED_CLONIDINE_FORMULARY_ENTRIES.map((e) => ({
    catalogCode: e.catalogCode,
    aliases: [...e.aliases, ...e.searchTerms],
  })),
] as const;

const GATE_BLOCKED = new Set(["INJECTION", "SUBCUTANEOUS"]);

export function normalizeLegacyAdministrationType(
  value: string | null | undefined
): string | null {
  const upper = value?.trim().toUpperCase();
  if (!upper) return null;
  if (upper === "SUBCUTANEOUS") return "SQ";
  return upper;
}

export function isEdMarCompatibleAdministrationType(
  administrationType: string | null | undefined
): boolean {
  const admin = normalizeLegacyAdministrationType(administrationType);
  if (!admin) return false;
  return WAVE4_SAFE_MAR_ADMIN_TYPES.has(admin);
}

export function resolveEdLegacyAdminTypeRemediation(
  catalogCode: string,
  currentAdministrationType: string | null | undefined
): string | null {
  const target = ED_LEGACY_ADMIN_TYPE_REMEDIATION_BY_CATALOG_CODE[catalogCode];
  if (!target) return null;

  const current = normalizeLegacyAdministrationType(currentAdministrationType);
  if (!current) return target.targetAdministrationType;
  if (target.legacyTypes.includes(current as "INJECTION" | "SUBCUTANEOUS")) {
    return target.targetAdministrationType;
  }
  if (GATE_BLOCKED.has(current)) {
    return target.targetAdministrationType;
  }
  if (WAVE4_SAFE_MAR_ADMIN_TYPES.has(current)) {
    return current;
  }
  return target.targetAdministrationType;
}

export function resolveEdProductAdministrationType(
  catalogCode: string,
  catalogAdministrationType: string | null | undefined,
  productAdministrationType: string | null | undefined
): string {
  const remediatedCatalog =
    resolveEdLegacyAdminTypeRemediation(catalogCode, catalogAdministrationType) ??
    normalizeLegacyAdministrationType(catalogAdministrationType);
  const remediatedProduct = resolveEdLegacyAdminTypeRemediation(
    catalogCode,
    productAdministrationType
  );
  const resolved = remediatedProduct ?? remediatedCatalog;
  return resolveWave4ProductAdministrationType(resolved);
}

export function validateEdLegacyAdminTypeRemediationManifest(): string[] {
  const errors: string[] = [];
  for (const entry of ED_LEGACY_ADMIN_TYPE_REMEDIATION) {
    if (!WAVE4_SAFE_MAR_ADMIN_TYPES.has(entry.targetAdministrationType)) {
      errors.push(`${entry.catalogCode}: target ${entry.targetAdministrationType} is not MAR-safe`);
    }
  }
  return errors;
}

export function validateEdClonidineFormularyEntries(): string[] {
  const errors: string[] = [];
  const codes = new Set<string>();
  for (const entry of ED_CLONIDINE_FORMULARY_ENTRIES) {
    if (codes.has(entry.catalogCode)) {
      errors.push(`duplicate clonidine catalogCode ${entry.catalogCode}`);
    }
    codes.add(entry.catalogCode);
    if (entry.administrationType !== "ORAL") {
      errors.push(`${entry.catalogCode}: clonidine tablets must be ORAL`);
    }
  }
  return errors;
}

export function validateEdCatalogHarmonizationManifest(): string[] {
  const errors: string[] = [];
  const canonicalCodes = new Set<string>();
  for (const entry of ED_CATALOG_HARMONIZATION) {
    if (canonicalCodes.has(entry.canonicalCatalogCode)) {
      errors.push(`duplicate harmonization canonical ${entry.canonicalCatalogCode}`);
    }
    canonicalCodes.add(entry.canonicalCatalogCode);
    if (entry.crossSearchAliases.length === 0) {
      errors.push(`${entry.canonicalCatalogCode}: harmonization requires crossSearchAliases`);
    }
  }
  return errors;
}
