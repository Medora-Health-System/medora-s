/**
 * MEDUI.MEDICATION.ONCOLOGY_GOVERNANCE_AND_FORMULARY_EXPANSION.1
 * Oncology formulary catalog manifest — inactive, governed, not provider-orderable.
 */

type OncologyFormularyEntry = {
  catalogCode: string;
  genericName: string;
  displayNameFr: string;
  displayNameEn: string;
  strength: string;
  dosageForm: string;
  route: string;
  therapeuticClass: string;
  bucket: "ONCOLOGY";
  mode: "CREATE";
  aliases: Array<{ text: string; language: "en" | "fr"; aliasType: "OTHER" }>;
  searchTerms: string[];
  governance: {
    isControlled: boolean;
    controlledSchedule: null;
    isHighAlert: boolean;
    requiresWitness: boolean;
    requiresDoubleSign: boolean;
    lasaGroupId: null;
    requiresPharmacyVerification: boolean;
    isBiologic?: boolean;
    isDmard?: boolean;
    isInsulin?: boolean;
    requiresSpecialtyReview?: boolean;
    isChemotherapy?: boolean;
  };
  isEssential: false;
  administrationType: string;
  billingClass: string;
};

function oncologyAlias(text: string, language: "en" | "fr") {
  return { text, language, aliasType: "OTHER" as const };
}

function chemoGovernance() {
  return {
    isControlled: false,
    controlledSchedule: null,
    isHighAlert: true,
    requiresWitness: false,
    requiresDoubleSign: false,
    lasaGroupId: null,
    requiresPharmacyVerification: true,
    isBiologic: false,
    isDmard: false,
    isInsulin: false,
    requiresSpecialtyReview: true,
    isChemotherapy: true,
  };
}

function supportiveHighAlertGovernance(biologic = false) {
  return {
    isControlled: false,
    controlledSchedule: null,
    isHighAlert: true,
    requiresWitness: false,
    requiresDoubleSign: false,
    lasaGroupId: null,
    requiresPharmacyVerification: true,
    isBiologic: biologic,
    isDmard: false,
    isInsulin: false,
    requiresSpecialtyReview: true,
    isChemotherapy: false,
  };
}

export const ENTERPRISE_ONCOLOGY_FORMULARY_MANIFEST: OncologyFormularyEntry[] = [
  {
    catalogCode: "FILGRASTIM_480_MCG_1_6_ML_INJECTABLE_SOUS_CUTANEE",
    genericName: "Filgrastim",
    displayNameFr: "Filgrastim",
    displayNameEn: "Filgrastim",
    strength: "480 mcg/1.6 mL",
    dosageForm: "injectable",
    route: "sous-cutanée",
    therapeuticClass: "Facteur de croissance",
    bucket: "ONCOLOGY",
    mode: "CREATE",
    aliases: [oncologyAlias("Neupogen", "en"), oncologyAlias("Neupogen", "fr"), oncologyAlias("G-CSF", "en")],
    searchTerms: ["filgrastim", "480 mcg", "sous cutanee", "neupogen", "g csf", "facteur de croissance"],
    governance: supportiveHighAlertGovernance(true),
    isEssential: false,
    administrationType: "SQ",
    billingClass: "THERAPEUTIC",
  },
  {
    catalogCode: "RASBURICASE_1_5_MG_POUDRE_INTRAVEINEUSE",
    genericName: "Rasburicase",
    displayNameFr: "Rasburicase",
    displayNameEn: "Rasburicase",
    strength: "1.5 mg",
    dosageForm: "poudre",
    route: "intraveineuse",
    therapeuticClass: "Antihyperuricémiant",
    bucket: "ONCOLOGY",
    mode: "CREATE",
    aliases: [oncologyAlias("Elitek", "en"), oncologyAlias("Elitek", "fr")],
    searchTerms: ["rasburicase", "1.5 mg", "intraveineuse", "elitek", "syndrome de lyse tumorale"],
    governance: supportiveHighAlertGovernance(true),
    isEssential: false,
    administrationType: "IV",
    billingClass: "THERAPEUTIC",
  },
  {
    catalogCode: "CYCLOPHOSPHAMIDE_1000_MG_POUDRE_INTRAVEINEUSE",
    genericName: "Cyclophosphamide",
    displayNameFr: "Cyclophosphamide",
    displayNameEn: "Cyclophosphamide",
    strength: "1000 mg",
    dosageForm: "poudre",
    route: "intraveineuse",
    therapeuticClass: "Chimiothérapie cytotoxique",
    bucket: "ONCOLOGY",
    mode: "CREATE",
    aliases: [oncologyAlias("Cytoxan", "en"), oncologyAlias("Cytoxan", "fr")],
    searchTerms: ["cyclophosphamide", "1000 mg", "intraveineuse", "cytoxan", "chimiotherapie"],
    governance: chemoGovernance(),
    isEssential: false,
    administrationType: "INFUSION",
    billingClass: "THERAPEUTIC",
  },
  {
    catalogCode: "DOXORUBICIN_50_MG_POUDRE_INTRAVEINEUSE",
    genericName: "Doxorubicin",
    displayNameFr: "Doxorubicine",
    displayNameEn: "Doxorubicin",
    strength: "50 mg",
    dosageForm: "poudre",
    route: "intraveineuse",
    therapeuticClass: "Chimiothérapie cytotoxique",
    bucket: "ONCOLOGY",
    mode: "CREATE",
    aliases: [oncologyAlias("Adriamycin", "en"), oncologyAlias("Adriamycine", "fr")],
    searchTerms: ["doxorubicin", "doxorubicine", "50 mg", "intraveineuse", "adriamycin"],
    governance: chemoGovernance(),
    isEssential: false,
    administrationType: "INFUSION",
    billingClass: "THERAPEUTIC",
  },
  {
    catalogCode: "CISPLATIN_50_MG_POUDRE_INTRAVEINEUSE",
    genericName: "Cisplatin",
    displayNameFr: "Cisplatine",
    displayNameEn: "Cisplatin",
    strength: "50 mg",
    dosageForm: "poudre",
    route: "intraveineuse",
    therapeuticClass: "Chimiothérapie cytotoxique",
    bucket: "ONCOLOGY",
    mode: "CREATE",
    aliases: [oncologyAlias("Platinol", "en"), oncologyAlias("Platinol", "fr")],
    searchTerms: ["cisplatin", "cisplatine", "50 mg", "intraveineuse", "platinol"],
    governance: chemoGovernance(),
    isEssential: false,
    administrationType: "INFUSION",
    billingClass: "THERAPEUTIC",
  },
  {
    catalogCode: "LEUCOVORIN_100_MG_POUDRE_INTRAVEINEUSE",
    genericName: "Leucovorin",
    displayNameFr: "Léucovorine",
    displayNameEn: "Leucovorin",
    strength: "100 mg",
    dosageForm: "poudre",
    route: "intraveineuse",
    therapeuticClass: "Antidote chimiothérapie",
    bucket: "ONCOLOGY",
    mode: "CREATE",
    aliases: [oncologyAlias("Folinic acid", "en"), oncologyAlias("Acide folinique", "fr")],
    searchTerms: ["leucovorin", "leucovorine", "100 mg", "intraveineuse", "folinic acid"],
    governance: supportiveHighAlertGovernance(false),
    isEssential: false,
    administrationType: "IV",
    billingClass: "THERAPEUTIC",
  },
  {
    catalogCode: "LEUCOVORIN_15_MG_COMPRIME_ORALE",
    genericName: "Leucovorin",
    displayNameFr: "Léucovorine",
    displayNameEn: "Leucovorin",
    strength: "15 mg",
    dosageForm: "comprimé",
    route: "orale",
    therapeuticClass: "Antidote chimiothérapie",
    bucket: "ONCOLOGY",
    mode: "CREATE",
    aliases: [oncologyAlias("Folinic acid 15 mg", "en"), oncologyAlias("Acide folinique 15 mg", "fr")],
    searchTerms: ["leucovorin", "leucovorine", "15 mg", "comprime", "orale"],
    governance: supportiveHighAlertGovernance(false),
    isEssential: false,
    administrationType: "ORAL",
    billingClass: "DRUG_SUPPLY",
  },
];

export const ENTERPRISE_ONCOLOGY_FORMULARY_BY_CODE: Record<string, OncologyFormularyEntry> =
  Object.fromEntries(ENTERPRISE_ONCOLOGY_FORMULARY_MANIFEST.map((entry) => [entry.catalogCode, entry]));
