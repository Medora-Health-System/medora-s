/**
 * M1.6C — Enterprise medication alias manifest (catalog MedicationAlias + search expansion).
 * No new medications — aliases for existing catalog codes only.
 */

import { ENTERPRISE_WAVE1_FORMULARY_MANIFEST } from "./enterpriseWave1FormularyManifest.js";
import { ENTERPRISE_WAVE2_FORMULARY_MANIFEST } from "./enterpriseWave2FormularyManifest.js";
import type {
  EnterpriseMedicationAliasCategory,
  EnterpriseMedicationAliasKind,
  EnterpriseMedicationAliasLine,
  EnterpriseMedicationAliasManifestEntry,
  EnterpriseMedicationSearchPair,
  EnterpriseMedicationSearchTypo,
} from "./enterpriseMedicationAliasTypes.js";

export type {
  EnterpriseMedicationAliasCategory,
  EnterpriseMedicationAliasKind,
  EnterpriseMedicationAliasLine,
  EnterpriseMedicationAliasManifestEntry,
  EnterpriseMedicationSearchCatalogHit,
  EnterpriseMedicationSearchPair,
  EnterpriseMedicationSearchTypo,
} from "./enterpriseMedicationAliasTypes.js";

function mapWave2Bucket(bucket: string): EnterpriseMedicationAliasCategory {
  switch (bucket) {
    case "ANTICOAGULATION":
      return "ANTICOAG";
    case "CARDIOLOGY":
      return "CARDIOVASCULAR";
    case "DIABETES":
      return "DIABETES";
    case "WOMENS_HEALTH":
      return "OTHER";
    case "PULMONOLOGY":
      return "OTHER";
    case "GI":
      return "GI";
    case "PSYCHIATRY":
      return "OTHER";
    case "INFECTIOUS_DISEASE":
    case "ER_CRITICAL":
      return "ER";
    case "CHRONIC":
      return "CHRONIC";
    default:
      return "OTHER";
  }
}

function buildWave2ManifestEntries(): EnterpriseMedicationAliasManifestEntry[] {
  return ENTERPRISE_WAVE2_FORMULARY_MANIFEST.map((entry) => {
    const aliases: EnterpriseMedicationAliasLine[] = [];
    const seen = new Set<string>();
    const push = (text: string, kind: EnterpriseMedicationAliasKind) => {
      const t = text.trim();
      if (t.length < 2) return;
      const key = t.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      aliases.push(line(t, kind));
    };
    push(entry.genericName, "GENERIC");
    if (entry.displayNameFr?.trim()) push(entry.displayNameFr, "FR");
    if (entry.displayNameEn?.trim()) push(entry.displayNameEn, "GENERIC");
    for (const a of entry.aliases) push(a, "BRAND");
    for (const t of entry.searchTerms) push(t, t.length <= 4 ? "ABBREV" : "GENERIC");
    return {
      catalogCode: entry.catalogCode,
      genericName: entry.genericName,
      category: mapWave2Bucket(entry.bucket),
      aliases,
    };
  });
}

function mapWave1Bucket(bucket: string): EnterpriseMedicationAliasCategory {
  switch (bucket) {
    case "ANTICOAGULATION":
      return "ANTICOAG";
    case "VACCINE":
      return "VACCINE";
    case "CHRONIC_CARE":
      return "CHRONIC";
    default:
      return "OTHER";
  }
}

function line(text: string, kind: EnterpriseMedicationAliasKind): EnterpriseMedicationAliasLine {
  return { text, kind };
}

function buildWave1ManifestEntries(): EnterpriseMedicationAliasManifestEntry[] {
  return ENTERPRISE_WAVE1_FORMULARY_MANIFEST.map((entry) => {
    const aliases: EnterpriseMedicationAliasLine[] = [];
    const seen = new Set<string>();
    const push = (text: string, kind: EnterpriseMedicationAliasKind) => {
      const t = text.trim();
      if (t.length < 2) return;
      const key = t.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      aliases.push(line(t, kind));
    };

    push(entry.genericName, "GENERIC");
    if (entry.displayNameFr?.trim()) push(entry.displayNameFr, "FR");
    if (entry.displayNameEn?.trim()) push(entry.displayNameEn, "GENERIC");
    for (const a of entry.aliases) push(a, "BRAND");
    for (const t of entry.searchTerms) {
      if (t.length <= 4 && !t.includes(" ")) push(t, "ABBREV");
      else push(t, "GENERIC");
    }

    return {
      catalogCode: entry.catalogCode,
      genericName: entry.genericName,
      category: mapWave1Bucket(entry.bucket),
      aliases,
    };
  });
}

/** Haiti / ER / controlled rows — supplemental alias coverage (existing catalog codes). */
const SUPPLEMENTAL_ALIAS_ENTRIES: EnterpriseMedicationAliasManifestEntry[] = [
  {
    catalogCode: "CEFTRIAXONE_1_G_INJECTABLE_INJECTION",
    genericName: "Ceftriaxone",
    category: "ER",
    aliases: [
      line("Rocephin", "BRAND"),
      line("rocephin", "BRAND"),
      line("ceph", "SHORTHAND"),
      line("ctx", "ABBREV"),
    ],
  },
  {
    catalogCode: "FUROSEMIDE_40_MG_COMPRIME_ORAL",
    genericName: "Furosemide",
    category: "CARDIOVASCULAR",
    aliases: [line("Lasix", "BRAND"), line("lasix", "BRAND"), line("furosémide", "FR")],
  },
  {
    catalogCode: "LORAZEPAM_2MG_ML_INJECTABLE",
    genericName: "Lorazepam",
    category: "CONTROLLED",
    aliases: [
      line("Ativan", "BRAND"),
      line("ativan", "BRAND"),
      line("benzo", "SHORTHAND"),
      line("sédation", "FR"),
    ],
  },
  {
    catalogCode: "MORPHINE_10_MG_PER_ML_INJECTABLE_INJECTION",
    genericName: "Morphine",
    category: "CONTROLLED",
    aliases: [
      line("MS", "ABBREV"),
      line("opioïde", "FR"),
      line("douleur sévère", "PATIENT_TERM"),
    ],
  },
  {
    catalogCode: "HYDROMORPHONE_2MG_ML_INJECTABLE",
    genericName: "Hydromorphone",
    category: "CONTROLLED",
    aliases: [line("Dilaudid", "BRAND"), line("dilaudid", "BRAND")],
  },
  {
    catalogCode: "ONDANSETRON_4_MG_PER_2_ML_INJECTABLE_INJECTION",
    genericName: "Ondansetron",
    category: "ER",
    aliases: [line("Zofran", "BRAND"), line("zofran", "BRAND"), line("antiémétique", "FR")],
  },
  {
    catalogCode: "METOCLOPRAMIDE_10_MG_PER_2_ML_INJECTABLE_INJECTION",
    genericName: "Metoclopramide",
    category: "ER",
    aliases: [line("Reglan", "BRAND"), line("reglan", "BRAND"), line("Primperan", "BRAND")],
  },
  {
    catalogCode: "MIDAZOLAM_5MG_ML_INJECTABLE",
    genericName: "Midazolam",
    category: "ER",
    aliases: [line("Versed", "BRAND"), line("versed", "BRAND")],
  },
  {
    catalogCode: "INSULIN_LISPRO_100_UI_ML_INJECTABLE_SOUS_CUTANEE",
    genericName: "Insulin lispro",
    category: "DIABETES",
    aliases: [line("Humalog", "BRAND"), line("humalog", "BRAND"), line("lispro", "SHORTHAND")],
  },
  {
    catalogCode: "INSULIN_GLARGINE_100_UI_ML_INJECTABLE_SOUS_CUTANEE",
    genericName: "Insulin glargine",
    category: "DIABETES",
    aliases: [line("Lantus", "BRAND"), line("lantus", "BRAND"), line("glargine", "SHORTHAND")],
  },
  {
    catalogCode: "INSULIN_ASPART_100_UI_ML_INJECTABLE_SOUS_CUTANEE",
    genericName: "Insulin aspart",
    category: "DIABETES",
    aliases: [line("Novolog", "BRAND"), line("novolog", "BRAND"), line("aspart", "SHORTHAND")],
  },
  {
    catalogCode: "METFORMIN_500",
    genericName: "Metformin",
    category: "DIABETES",
    aliases: [
      line("Glucophage", "BRAND"),
      line("glucophage", "BRAND"),
      line("metformine", "FR"),
      line("diabète", "PATIENT_TERM"),
    ],
  },
  {
    catalogCode: "AMLODIPINE_5_MG_COMPRIME_ORAL",
    genericName: "Amlodipine",
    category: "CARDIOVASCULAR",
    aliases: [line("Norvasc", "BRAND"), line("norvasc", "BRAND")],
  },
  {
    catalogCode: "LISINOPRIL_10",
    genericName: "Lisinopril",
    category: "CARDIOVASCULAR",
    aliases: [
      line("Zestril", "BRAND"),
      line("Prinivil", "BRAND"),
      line("zestril", "BRAND"),
      line("prinivil", "BRAND"),
    ],
  },
  {
    catalogCode: "LOSARTAN_50",
    genericName: "Losartan",
    category: "CARDIOVASCULAR",
    aliases: [line("Cozaar", "BRAND"), line("cozaar", "BRAND")],
  },
  {
    catalogCode: "HYDROCHLOROTHIAZIDE_25",
    genericName: "Hydrochlorothiazide",
    category: "CARDIOVASCULAR",
    aliases: [
      line("HCTZ", "ABBREV"),
      line("hctz", "ABBREV"),
      line("Microzide", "BRAND"),
      line("thiazide", "SHORTHAND"),
    ],
  },
  {
    catalogCode: "LEVOTHYROXINE_50_MCG_COMPRIME_ORAL",
    genericName: "Levothyroxine",
    category: "CHRONIC",
    aliases: [
      line("Synthroid", "BRAND"),
      line("synthroid", "BRAND"),
      line("lévothyroxine", "FR"),
      line("thyroïde", "PATIENT_TERM"),
    ],
  },
  {
    catalogCode: "OMEPRAZOLE_20",
    genericName: "Omeprazole",
    category: "GI",
    aliases: [
      line("Prilosec", "BRAND"),
      line("prilosec", "BRAND"),
      line("Losec", "BRAND"),
      line("ipp", "SHORTHAND"),
    ],
  },
  {
    catalogCode: "PANTOPRAZOLE_40_MG_COMPRIME_ORAL",
    genericName: "Pantoprazole",
    category: "GI",
    aliases: [line("Protonix", "BRAND"), line("protonix", "BRAND"), line("ppi", "SHORTHAND")],
  },
];

function mergeManifestEntries(
  entries: EnterpriseMedicationAliasManifestEntry[]
): EnterpriseMedicationAliasManifestEntry[] {
  const byCode = new Map<string, EnterpriseMedicationAliasManifestEntry>();

  for (const entry of entries) {
    const existing = byCode.get(entry.catalogCode);
    if (!existing) {
      byCode.set(entry.catalogCode, { ...entry, aliases: [...entry.aliases] });
      continue;
    }
    const mergedAliases = [...existing.aliases];
    const seen = new Set(mergedAliases.map((a) => a.text.toLowerCase()));
    for (const alias of entry.aliases) {
      const key = alias.text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      mergedAliases.push(alias);
    }
    byCode.set(entry.catalogCode, { ...existing, aliases: mergedAliases });
  }

  return [...byCode.values()];
}

export const ENTERPRISE_MEDICATION_ALIAS_MANIFEST: EnterpriseMedicationAliasManifestEntry[] =
  mergeManifestEntries([
    ...buildWave1ManifestEntries(),
    ...buildWave2ManifestEntries(),
    ...SUPPLEMENTAL_ALIAS_ENTRIES,
  ]);

export const ENTERPRISE_MEDICATION_ALIAS_MANIFEST_VERSION = "M1.6D" as const;

/** Clinician-critical brand ↔ generic pairs (scoped validation). */
export const ENTERPRISE_MEDICATION_REQUIRED_SEARCH_PAIRS: EnterpriseMedicationSearchPair[] = [
  { generic: "warfarin", brand: "coumadin", catalogCode: "WARFARIN_5_MG_COMPRIME_ORAL" },
  {
    generic: "enoxaparin",
    brand: "lovenox",
    catalogCode: "ENOXAPARIN_40_MG_PER_0.4_ML_INJECTABLE_INJECTION",
  },
  { generic: "apixaban", brand: "eliquis" },
  { generic: "rivaroxaban", brand: "xarelto" },
  { generic: "dabigatran", brand: "pradaxa" },
  { generic: "metformin", brand: "glucophage", catalogCode: "METFORMIN_500" },
  { generic: "amlodipine", brand: "norvasc", catalogCode: "AMLODIPINE_5_MG_COMPRIME_ORAL" },
  { generic: "lisinopril", brand: "zestril", catalogCode: "LISINOPRIL_10" },
  { generic: "losartan", brand: "cozaar", catalogCode: "LOSARTAN_50" },
  { generic: "atorvastatin", brand: "lipitor" },
  { generic: "empagliflozin", brand: "jardiance" },
  { generic: "levothyroxine", brand: "synthroid", catalogCode: "LEVOTHYROXINE_50_MCG_COMPRIME_ORAL" },
  { generic: "hydrochlorothiazide", brand: "hctz", catalogCode: "HYDROCHLOROTHIAZIDE_25" },
  { generic: "omeprazole", brand: "prilosec", catalogCode: "OMEPRAZOLE_20" },
  { generic: "ceftriaxone", brand: "rocephin", catalogCode: "CEFTRIAXONE_1_G_INJECTABLE_INJECTION" },
  { generic: "lorazepam", brand: "ativan", catalogCode: "LORAZEPAM_2MG_ML_INJECTABLE" },
  { generic: "ondansetron", brand: "zofran", catalogCode: "ONDANSETRON_4_MG_PER_2_ML_INJECTABLE_INJECTION" },
  { generic: "furosemide", brand: "lasix", catalogCode: "FUROSEMIDE_40_MG_COMPRIME_ORAL" },
  { generic: "midazolam", brand: "versed", catalogCode: "MIDAZOLAM_5MG_ML_INJECTABLE" },
  {
    generic: "metoclopramide",
    brand: "reglan",
    catalogCode: "METOCLOPRAMIDE_10_MG_PER_2_ML_INJECTABLE_INJECTION",
  },
  {
    generic: "insulin lispro",
    brand: "humalog",
    catalogCode: "INSULIN_LISPRO_100_UI_ML_INJECTABLE_SOUS_CUTANEE",
  },
  {
    generic: "insulin glargine",
    brand: "lantus",
    catalogCode: "INSULIN_GLARGINE_100_UI_ML_INJECTABLE_SOUS_CUTANEE",
  },
  {
    generic: "insulin aspart",
    brand: "novolog",
    catalogCode: "INSULIN_ASPART_100_UI_ML_INJECTABLE_SOUS_CUTANEE",
  },
  { generic: "hydromorphone", brand: "dilaudid", catalogCode: "HYDROMORPHONE_2MG_ML_INJECTABLE" },
];

/**
 * Safe typo → canonical token on the same medication (expanded at query time only).
 * Does not fuzzy-match across catalog rows.
 */
export const ENTERPRISE_MEDICATION_SEARCH_TYPOS: EnterpriseMedicationSearchTypo[] = [
  { catalogCode: "WARFARIN_5_MG_COMPRIME_ORAL", typo: "cumadin", canonical: "coumadin" },
  { catalogCode: "WARFARIN_5_MG_COMPRIME_ORAL", typo: "coumadn", canonical: "coumadin" },
  {
    catalogCode: "ENOXAPARIN_40_MG_PER_0.4_ML_INJECTABLE_INJECTION",
    typo: "lovanox",
    canonical: "lovenox",
  },
  {
    catalogCode: "LEVOTHYROXINE_50_MCG_COMPRIME_ORAL",
    typo: "levothyroxin",
    canonical: "levothyroxine",
  },
  {
    catalogCode: "HYDROCHLOROTHIAZIDE_25",
    typo: "hydrochlorothiazid",
    canonical: "hydrochlorothiazide",
  },
  { catalogCode: "OMEPRAZOLE_20", typo: "omeprazol", canonical: "omeprazole" },
  { catalogCode: "PANTOPRAZOLE_40_MG_COMPRIME_ORAL", typo: "pantoprazol", canonical: "pantoprazole" },
  { catalogCode: "ATORVASTATIN_20_MG_COMPRIME_ORAL", typo: "atorvastatine", canonical: "atorvastatin" },
];
