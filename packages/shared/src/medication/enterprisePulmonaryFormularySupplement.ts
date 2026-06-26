/**
 * MEDUI.MEDICATION.PULMONARY_AND_CONTINUOUS_INFUSION_EXPANSION.1
 * Supplementary pulmonary formulary entries not yet in wave manifests.
 */

export type EnterprisePulmonaryFormularySupplementEntry = {
  catalogCode: string;
  genericName: string;
  displayNameFr: string;
  displayNameEn: string;
  strength: string;
  dosageForm: string;
  route: string;
  therapeuticClass: string;
  administrationType: "INHALATION";
  billingClass: "MEDICATION";
  mode: "CREATE";
  aliases: Array<{ text: string; language: "en" | "fr" }>;
  searchTerms: string[];
  governance: {
    isControlled: false;
    controlledSchedule: null;
    requiresWitness: false;
    requiresDoubleSign: false;
  };
  isEssential: boolean;
};

export const ENTERPRISE_PULMONARY_FORMULARY_SUPPLEMENT: readonly EnterprisePulmonaryFormularySupplementEntry[] = [
  {
    catalogCode: "LEVALBUTEROL_1_25_MG_3_ML_SOLUTION_DE_NEBULISATION_INHALEE",
    genericName: "Levalbuterol",
    displayNameFr: "Lévalbutérol",
    displayNameEn: "Levalbuterol",
    strength: "1.25 mg/3 mL",
    dosageForm: "solution de nébulisation",
    route: "inhalée",
    therapeuticClass: "Bronchodilatateur",
    administrationType: "INHALATION",
    billingClass: "MEDICATION",
    mode: "CREATE",
    aliases: [
      { text: "Xopenex", language: "en" },
      { text: "Xopenex", language: "fr" },
      { text: "Levalbuterol", language: "en" },
    ],
    searchTerms: ["levalbuterol", "xopenex", "lévalbutérol"],
    governance: {
      isControlled: false,
      controlledSchedule: null,
      requiresWitness: false,
      requiresDoubleSign: false,
    },
    isEssential: false,
  },
  {
    catalogCode: "HYPERTONIC_SALINE_3_NEB_SOLUTION_DE_NEBULISATION_INHALEE",
    genericName: "Hypertonic saline 3%",
    displayNameFr: "NaCl hypertonique 3%",
    displayNameEn: "Hypertonic saline 3%",
    strength: "3%",
    dosageForm: "solution de nébulisation",
    route: "inhalée",
    therapeuticClass: "Mucolytique / airway clearance",
    administrationType: "INHALATION",
    billingClass: "MEDICATION",
    mode: "CREATE",
    aliases: [
      { text: "HTS neb", language: "en" },
      { text: "NaCl 3% neb", language: "en" },
    ],
    searchTerms: ["hypertonic saline", "3% saline", "hts neb"],
    governance: {
      isControlled: false,
      controlledSchedule: null,
      requiresWitness: false,
      requiresDoubleSign: false,
    },
    isEssential: false,
  },
] as const;

export const ENTERPRISE_PULMONARY_FORMULARY_SUPPLEMENT_BY_CODE: Record<
  string,
  EnterprisePulmonaryFormularySupplementEntry
> = Object.fromEntries(ENTERPRISE_PULMONARY_FORMULARY_SUPPLEMENT.map((entry) => [entry.catalogCode, entry]));

export const ENTERPRISE_PULMONARY_BILLING_SUPPLEMENT_BY_CODE: Record<
  string,
  { hcpcs: string; ndc11: string | null; ndcDisplay: string | null; billingUnitType: string }
> = {
  LEVALBUTEROL_1_25_MG_3_ML_SOLUTION_DE_NEBULISATION_INHALEE: {
    hcpcs: "J7612",
    ndc11: null,
    ndcDisplay: null,
    billingUnitType: "UNIT",
  },
  HYPERTONIC_SALINE_3_NEB_SOLUTION_DE_NEBULISATION_INHALEE: {
    hcpcs: "J7682",
    ndc11: null,
    ndcDisplay: null,
    billingUnitType: "UNIT",
  },
};
