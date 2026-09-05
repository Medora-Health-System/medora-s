/**
 * Medication Knowledge Expansion Wave 2 — Emergency Medicine Foundation.
 * Content + search organization only. Reuses CatalogMedication / aliases / evidence.
 * Does not redesign engines, increase autonomy, or resolve acetaminophen identity.
 */

import { EM_BATCH_MEDICATION_FAMILIES } from "./medicationEmBatchFamilies.js";
import { familyKeyFromName, normalizeMedicationFamilyName } from "./medicationKnowledgePopulationGovernance.js";
import { pickProductUiCopy } from "../i18n/productUiLocale.js";

export const MK_EXPANSION_WAVE2_CERTIFICATION_ID =
  "MEDUI.MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_EMERGENCY_MEDICINE_FOUNDATION";

export const MK_EXPANSION_WAVE2_IMPLEMENTATION_ID =
  "MEDUI.MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_EM_SPECIALTY_PACKS";

export const MK_EXPANSION_WAVE2_PROGRAM_KEY = "EM_KNOWLEDGE_EXPANSION_WAVE2_V1";

export const MK_EXPANSION_WAVE2_PACK_MARKER_PREFIX = "EM_PACK:";

export const MK_EXPANSION_WAVE2_DEFAULTS = {
  clinicalActivationEnabled: false,
  enterpriseActiveAllowed: false,
  productionCdsEnabled: false,
  orderFromRecommendationEnabled: false,
  resolveAcetaminophenIdentity: false,
  inventUnsupportedMetadata: false,
  duplicateMedicationMaster: false,
} as const;

export const MK_EXPANSION_WAVE2_CERTIFICATION_DECISION_VALUES = [
  "MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_CERTIFIED",
  "MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_CERTIFIED_WITH_COVERAGE_GAPS",
  "MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_NOT_CERTIFIED",
] as const;

export type MkExpansionWave2CertificationDecision =
  (typeof MK_EXPANSION_WAVE2_CERTIFICATION_DECISION_VALUES)[number];

export type MkExpansionWave2SpecialtyPackKey =
  | "CARDIOLOGY"
  | "PULMONARY"
  | "NEUROLOGY"
  | "INFECTIOUS_DISEASE"
  | "TRAUMA"
  | "TOXICOLOGY"
  | "ENDOCRINE"
  | "OB"
  | "PEDIATRICS"
  | "OPHTHALMOLOGY"
  | "ENT"
  | "UROLOGY"
  | "GASTROENTEROLOGY"
  | "ALLERGY"
  | "PSYCHIATRY";

export type MkExpansionWave2SpecialtyPack = {
  packKey: MkExpansionWave2SpecialtyPackKey;
  titleEn: string;
  titleFr: string;
  /** Normalized family names (lowercase). Acetaminophen never included. */
  familyNames: readonly string[];
  /** Search abbreviations / synonyms / common misspellings (query expansion). */
  searchTokens: readonly string[];
};

function pack(
  packKey: MkExpansionWave2SpecialtyPackKey,
  titleEn: string,
  titleFr: string,
  familyNames: readonly string[],
  searchTokens: readonly string[] = []
): MkExpansionWave2SpecialtyPack {
  const cleaned = familyNames
    .map(normalizeMedicationFamilyName)
    .filter((n) => n.length > 0 && !/acetaminophen|paracetamol/.test(n));
  return {
    packKey,
    titleEn,
    titleFr,
    familyNames: [...new Set(cleaned)],
    searchTokens: searchTokens.map(normalizeMedicationFamilyName),
  };
}

/**
 * EM specialty packs — organize existing EM batch families + knowledge Wave 2/3/4 candidates.
 * Catalog rows are enriched (aliases / pack markers); no second medication model.
 */
export const MK_EXPANSION_WAVE2_SPECIALTY_PACKS: readonly MkExpansionWave2SpecialtyPack[] = [
  pack(
    "CARDIOLOGY",
    "Cardiology / resus",
    "Cardiologie / réanimation",
    [
      "amiodarone",
      "adenosine",
      "lidocaine",
      "diltiazem",
      "metoprolol",
      "esmolol",
      "labetalol",
      "hydralazine",
      "nicardipine",
      "nitroglycerin",
      "heparin",
      "enoxaparin",
      "aspirin",
      "epinephrine",
      "norepinephrine",
      "dopamine",
      "dobutamine",
      "phenylephrine",
      "vasopressin",
      "atropine",
      "protamine",
      "vitamin k",
      "prothrombin complex concentrate",
    ],
    ["amio", "ntg", "nitro", "levo", "pressor", "acs", "stemi", "nstemi", "afib"]
  ),
  pack(
    "PULMONARY",
    "Pulmonary / airway",
    "Pneumologie / voies aériennes",
    [
      "albuterol",
      "ipratropium",
      "budesonide",
      "methylprednisolone",
      "dexamethasone",
      "prednisone",
      "magnesium sulfate",
      "racemic epinephrine",
      "succinylcholine",
      "rocuronium",
      "vecuronium",
      "sugammadex",
    ],
    ["salbutamol", "ventolin", "neb", "nebulizer", "asthma", "copd", "rsi", "roc"]
  ),
  pack(
    "NEUROLOGY",
    "Neurology",
    "Neurologie",
    [
      "levetiracetam",
      "fosphenytoin",
      "phenytoin",
      "valproate sodium",
      "phenobarbital",
      "lacosamide",
      "mannitol",
      "hypertonic saline",
      "alteplase",
      "tenecteplase",
      "metoclopramide",
      "prochlorperazine",
    ],
    ["keppra", "tpa", "tnk", "status", "stroke", "icp", "migraine"]
  ),
  pack(
    "INFECTIOUS_DISEASE",
    "Infectious disease",
    "Infectiologie",
    [
      "ceftriaxone",
      "cefazolin",
      "cefepime",
      "ceftazidime",
      "piperacillin / tazobactam",
      "vancomycin",
      "clindamycin",
      "azithromycin",
      "doxycycline",
      "amoxicillin / clavulanate",
      "ciprofloxacin",
      "levofloxacin",
      "metronidazole",
      "meropenem",
      "ertapenem",
      "linezolid",
      "fluconazole",
      "acyclovir",
    ],
    ["vanc", "zosyn", "pip-tazo", "rocephin", "abx", "empiric"]
  ),
  pack(
    "TRAUMA",
    "Trauma / hemostasis",
    "Traumatologie / hémostase",
    [
      "tranexamic acid",
      "fentanyl",
      "morphine",
      "hydromorphone",
      "ketamine",
      "midazolam",
      "succinylcholine",
      "rocuronium",
      "prothrombin complex concentrate",
    ],
    ["txa", "massive transfusion", "mtp", "dilaudid"]
  ),
  pack(
    "TOXICOLOGY",
    "Toxicology / antidotes",
    "Toxicologie / antidotes",
    [
      "naloxone",
      "flumazenil",
      "acetylcysteine",
      "hydroxocobalamin",
      "digoxin immune fab",
      "fomepizole",
      "activated charcoal",
      "regular insulin",
      "glucagon",
    ],
    ["narcan", "nac", "cyanokit", "digibind", "antidote", "od"]
  ),
  pack(
    "ENDOCRINE",
    "Endocrine / electrolytes",
    "Endocrinologie / électrolytes",
    [
      "regular insulin",
      "insulin lispro",
      "dextrose 50%",
      "dextrose 10%",
      "glucagon",
      "calcium gluconate",
      "calcium chloride",
      "sodium bicarbonate",
      "potassium chloride",
      "sodium phosphate",
      "magnesium sulfate",
    ],
    ["dka", "hhs", "d50", "hyperk", "kayexalate"]
  ),
  pack(
    "OB",
    "Obstetrics",
    "Obstétrique",
    ["magnesium sulfate", "oxytocin", "methylergonovine", "tranexamic acid"],
    ["pitocin", "pphemorrhage", "eclampsia", "pph", "mag"]
  ),
  pack(
    "PEDIATRICS",
    "Pediatrics",
    "Pédiatrie",
    [
      "epinephrine",
      "atropine",
      "amiodarone",
      "ceftriaxone",
      "ibuprofen",
      "ondansetron",
      "albuterol",
      "dexamethasone",
      "naloxone",
    ],
    ["peds", "pediatric", "broselow", "weight based"]
  ),
  pack(
    "OPHTHALMOLOGY",
    "Ophthalmology",
    "Ophtalmologie",
    ["tetracaine", "fluorescein", "erythromycin", "ofloxacin"],
    ["eye drop", "ophto", "corneal"]
  ),
  pack(
    "ENT",
    "ENT",
    "ORL",
    ["lidocaine with epinephrine", "oxymetazoline", "amoxicillin / clavulanate"],
    ["epistaxis", "afrin", "otitis"]
  ),
  pack(
    "UROLOGY",
    "Urology",
    "Urologie",
    ["ciprofloxacin", "ceftriaxone", "tamsulosin", "ketorolac"],
    ["renal colic", "uti", "pyelo"]
  ),
  pack(
    "GASTROENTEROLOGY",
    "Gastroenterology",
    "Gastroentérologie",
    [
      "pantoprazole",
      "omeprazole",
      "famotidine",
      "ondansetron",
      "metoclopramide",
      "promethazine",
      "lactulose",
      "polyethylene glycol",
      "octreotide",
    ],
    ["gi bleed", "antiemetic", "ppi", "he"]
  ),
  pack(
    "ALLERGY",
    "Allergy / anaphylaxis",
    "Allergie / anaphylaxie",
    [
      "epinephrine",
      "epinephrine autoinjector",
      "diphenhydramine",
      "cetirizine",
      "methylprednisolone",
      "dexamethasone",
      "prednisone",
      "ranitidine",
      "famotidine",
    ],
    ["anaphylaxis", "epi", "epipen", "benadryl"]
  ),
  pack(
    "PSYCHIATRY",
    "Psychiatry / withdrawal",
    "Psychiatrie / sevrage",
    [
      "haloperidol",
      "droperidol",
      "olanzapine",
      "ziprasidone",
      "lorazepam",
      "diazepam",
      "midazolam",
      "ketamine",
    ],
    ["agitation", "chemical restraint", "aws", "ciwa", "cows"]
  ),
];

const MK_EXPANSION_WAVE2_PACK_TITLE_ES: Record<MkExpansionWave2SpecialtyPackKey, string> = {
  CARDIOLOGY: "Cardiología / reanimación",
  PULMONARY: "Neumología / vía aérea",
  NEUROLOGY: "Neurología",
  INFECTIOUS_DISEASE: "Enfermedades infecciosas",
  TRAUMA: "Trauma / hemostasia",
  TOXICOLOGY: "Toxicología / antídotos",
  ENDOCRINE: "Endocrinología / electrolitos",
  OB: "Obstetricia",
  PEDIATRICS: "Pediatría",
  OPHTHALMOLOGY: "Oftalmología",
  ENT: "ORL",
  UROLOGY: "Urología",
  GASTROENTEROLOGY: "Gastroenterología",
  ALLERGY: "Alergia / anafilaxia",
  PSYCHIATRY: "Psiquiatría / abstinencia",
};

export function resolveMkExpansionWave2PackTitle(
  pack: MkExpansionWave2SpecialtyPack,
  locale: string | null | undefined
): string {
  return pickProductUiCopy(
    locale,
    { en: pack.titleEn, fr: pack.titleFr, es: MK_EXPANSION_WAVE2_PACK_TITLE_ES[pack.packKey] },
    MK_EXPANSION_WAVE2_PACK_TITLE_ES[pack.packKey]
  );
}

export function mkExpansionWave2PackMarker(
  packKey: MkExpansionWave2SpecialtyPackKey
): string {
  return `${MK_EXPANSION_WAVE2_PACK_MARKER_PREFIX}${packKey}`;
}

export function listMkExpansionWave2FamilyNames(): string[] {
  const set = new Set<string>();
  for (const p of MK_EXPANSION_WAVE2_SPECIALTY_PACKS) {
    for (const n of p.familyNames) set.add(n);
  }
  return [...set].sort();
}

export function listMkExpansionWave2FamilyKeys(): string[] {
  return listMkExpansionWave2FamilyNames().map(familyKeyFromName);
}

export function assertMkExpansionWave2NoAcetaminophen(): void {
  for (const p of MK_EXPANSION_WAVE2_SPECIALTY_PACKS) {
    for (const n of p.familyNames) {
      if (/acetaminophen|paracetamol/.test(n)) {
        throw new Error(
          "Knowledge Expansion Wave 2 forbids acetaminophen; identity remains blocked."
        );
      }
    }
  }
}

export function assertMkExpansionWave2SafetyDefaults(): void {
  assertMkExpansionWave2NoAcetaminophen();
  if (MK_EXPANSION_WAVE2_DEFAULTS.clinicalActivationEnabled) {
    throw new Error("Wave 2 expansion forbids clinicalActivationEnabled.");
  }
  if (MK_EXPANSION_WAVE2_DEFAULTS.resolveAcetaminophenIdentity) {
    throw new Error("Wave 2 expansion forbids acetaminophen identity resolution.");
  }
  if (MK_EXPANSION_WAVE2_DEFAULTS.duplicateMedicationMaster) {
    throw new Error("Wave 2 expansion forbids a second medication master.");
  }
}

/** Query expansions: abbreviations, synonyms, pack tokens → family tokens. */
export function buildMkExpansionWave2SearchQueryExpansions(): Readonly<
  Record<string, readonly string[]>
> {
  const map = new Map<string, Set<string>>();
  const add = (key: string, ...extra: string[]) => {
    const k = normalizeMedicationFamilyName(key);
    if (k.length < 2) return;
    let set = map.get(k);
    if (!set) {
      set = new Set<string>();
      map.set(k, set);
    }
    set.add(k);
    for (const e of extra) {
      const t = normalizeMedicationFamilyName(e);
      if (t.length >= 2) set.add(t);
    }
  };

  for (const p of MK_EXPANSION_WAVE2_SPECIALTY_PACKS) {
    add(p.packKey.toLowerCase().replace(/_/g, " "));
    for (const fam of p.familyNames) {
      add(fam);
      for (const tok of p.searchTokens) add(tok, fam);
    }
    for (const tok of p.searchTokens) {
      add(tok, ...p.familyNames.slice(0, 5));
    }
  }

  // Common ED typos / brand bridges (metadata-only expansions).
  add("narcan", "naloxone");
  add("naloxon", "naloxone");
  add("epinephrin", "epinephrine");
  add("adrenaline", "epinephrine");
  add("ventolin", "albuterol");
  add("salbutamol", "albuterol");
  add("zofran", "ondansetron");
  add("protonix", "pantoprazole");
  add("lasix", "furosemide");
  add("atropin", "atropine");
  add("rocuronum", "rocuronium");
  add("succ", "succinylcholine");
  add("sux", "succinylcholine");

  const out: Record<string, readonly string[]> = {};
  for (const [k, set] of map) out[k] = [...set];
  return out;
}

export function getMkExpansionWave2PackCoverageStats(input: {
  matchedFamilyNames: readonly string[];
}): {
  packCount: number;
  familyCount: number;
  matchedFamilyCount: number;
  coveragePercent: number;
  packs: Array<{
    packKey: string;
    familyCount: number;
    matchedCount: number;
    coveragePercent: number;
  }>;
} {
  const matched = new Set(
    input.matchedFamilyNames.map(normalizeMedicationFamilyName)
  );
  const packs = MK_EXPANSION_WAVE2_SPECIALTY_PACKS.map((p) => {
    const matchedCount = p.familyNames.filter((n) => matched.has(n)).length;
    return {
      packKey: p.packKey,
      familyCount: p.familyNames.length,
      matchedCount,
      coveragePercent:
        p.familyNames.length === 0
          ? 0
          : Math.round((matchedCount / p.familyNames.length) * 100),
    };
  });
  const familyCount = listMkExpansionWave2FamilyNames().length;
  const matchedFamilyCount = listMkExpansionWave2FamilyNames().filter((n) =>
    matched.has(n)
  ).length;
  return {
    packCount: packs.length,
    familyCount,
    matchedFamilyCount,
    coveragePercent:
      familyCount === 0
        ? 0
        : Math.round((matchedFamilyCount / familyCount) * 100),
    packs,
  };
}

/** Families already curated in EM batch that overlap Wave 2 packs. */
export function listMkExpansionWave2EmBatchOverlap(): string[] {
  const packFamilies = new Set(listMkExpansionWave2FamilyNames());
  return EM_BATCH_MEDICATION_FAMILIES.filter(
    (f) =>
      !f.excluded &&
      packFamilies.has(normalizeMedicationFamilyName(f.genericName))
  ).map((f) => normalizeMedicationFamilyName(f.genericName));
}
